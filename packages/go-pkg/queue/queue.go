package queue

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

var errNil = errors.New("queue: nil reply")

// Job represents the ASR/alignment work item pushed from the backend.
// A consumer (Go or Python) will download the audio from object storage,
// run ASR, align with the expected Arabic text, and persist the results.
type Job struct {
	SessionID      string    `json:"session_id"`
	AudioKey       string    `json:"audio_key"`
	AyahID         int64     `json:"ayah_id"`
	ExpectedTextAR string    `json:"expected_text_ar"`
	EnqueuedAt     time.Time `json:"enqueued_at"`
	AuthToken      string    `json:"auth_token,omitempty"`
}

// Config defines how the queue client connects to Redis and which list to use.
type Config struct {
	// RedisURL should include credentials, host, port, and DB index.
	// Example: redis://:pass@localhost:6379/0
	RedisURL string
	// QueueName is the Redis list key that will hold serialized jobs.
	QueueName string
	// VisibilityTimeout controls how long a consumer can work on a job
	// before it is considered stuck and re-queued. If zero, a default is used.
	VisibilityTimeout time.Duration
	// DeadLetterQueue is an optional list key for jobs that repeatedly fail.
	DeadLetterQueue string
	// MaxDeliveries controls how many times a job may be retried before
	// moving to the dead-letter queue. If zero, a default is used.
	MaxDeliveries int
	// TLS configures whether to use TLS (rediss://).
	TLS bool
}

type redisConn struct {
	mu     sync.Mutex
	conn   net.Conn
	reader *bufio.Reader
	writer *bufio.Writer
}

func newRedisConn(u *url.URL, useTLS bool) (*redisConn, error) {
	addr := u.Host
	if !strings.Contains(addr, ":") {
		addr += ":6379"
	}

	var conn net.Conn
	var err error
	if useTLS {
		conn, err = tls.Dial("tcp", addr, &tls.Config{InsecureSkipVerify: true})
	} else {
		conn, err = net.Dial("tcp", addr)
	}
	if err != nil {
		return nil, fmt.Errorf("queue: dial redis: %w", err)
	}

	rc := &redisConn{
		conn:   conn,
		reader: bufio.NewReader(conn),
		writer: bufio.NewWriter(conn),
	}

	if pwd, ok := u.User.Password(); ok && pwd != "" {
		username := u.User.Username()
		if username != "" {
			if _, err := rc.do(context.Background(), "AUTH", username, pwd); err != nil {
				return nil, fmt.Errorf("queue: auth: %w", err)
			}
		} else {
			if _, err := rc.do(context.Background(), "AUTH", pwd); err != nil {
				return nil, fmt.Errorf("queue: auth: %w", err)
			}
		}
	}

	if len(u.Path) > 1 {
		db := strings.TrimPrefix(u.Path, "/")
		if db != "" {
			if _, err := rc.do(context.Background(), "SELECT", db); err != nil {
				return nil, fmt.Errorf("queue: select db: %w", err)
			}
		}
	}

	return rc, nil
}

func (c *redisConn) do(ctx context.Context, args ...string) (any, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if deadline, ok := ctx.Deadline(); ok {
		_ = c.conn.SetDeadline(deadline)
	} else {
		_ = c.conn.SetDeadline(time.Time{})
	}

	if err := writeCommand(c.writer, args...); err != nil {
		return nil, err
	}
	return readReply(c.reader)
}

func writeCommand(w *bufio.Writer, args ...string) error {
	if _, err := fmt.Fprintf(w, "*%d\r\n", len(args)); err != nil {
		return err
	}
	for _, arg := range args {
		if _, err := fmt.Fprintf(w, "$%d\r\n%s\r\n", len(arg), arg); err != nil {
			return err
		}
	}
	return w.Flush()
}

func readReply(r *bufio.Reader) (any, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return nil, err
	}
	if len(line) == 0 {
		return nil, errors.New("queue: empty redis reply")
	}
	prefix := line[0]
	payload := strings.TrimSuffix(line[1:], "\r\n")

	switch prefix {
	case '+': // Simple string
		return payload, nil
	case '-': // Error
		return nil, errors.New(payload)
	case ':': // Integer
		val, convErr := strconv.ParseInt(payload, 10, 64)
		if convErr != nil {
			return nil, convErr
		}
		return val, nil
	case '$': // Bulk string
		size, convErr := strconv.Atoi(payload)
		if convErr != nil {
			return nil, convErr
		}
		if size == -1 {
			return nil, errNil
		}
		buf := make([]byte, size+2)
		if _, err := r.Read(buf); err != nil {
			return nil, err
		}
		return string(buf[:size]), nil
	case '*': // Array
		count, convErr := strconv.Atoi(payload)
		if convErr != nil {
			return nil, convErr
		}
		if count == -1 {
			return nil, errNil
		}
		items := make([]any, 0, count)
		for i := 0; i < count; i++ {
			item, err := readReply(r)
			if err != nil && !errors.Is(err, errNil) {
				return nil, err
			}
			items = append(items, item)
		}
		return items, nil
	default:
		return nil, fmt.Errorf("queue: unexpected redis reply %q", line)
	}
}

// Client wraps a Redis connection for publishing and consuming jobs.
type Client struct {
	cfg        Config
	redis      *redisConn
	queueKey   string
	deadLetter string
}

// NewClient parses the Redis URL and prepares a minimal RESP connection.
func NewClient(cfg Config) (*Client, error) {
	if cfg.RedisURL == "" {
		return nil, errors.New("queue: RedisURL is required")
	}
	if cfg.QueueName == "" {
		return nil, errors.New("queue: QueueName is required")
	}

	parsed, err := url.Parse(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("queue: parse redis url: %w", err)
	}

	useTLS := cfg.TLS || parsed.Scheme == "rediss"
	conn, err := newRedisConn(parsed, useTLS)
	if err != nil {
		return nil, err
	}

	dlq := cfg.DeadLetterQueue
	if dlq == "" {
		dlq = cfg.QueueName + ":dlq"
	}

	return &Client{
		cfg:        cfg,
		redis:      conn,
		queueKey:   cfg.QueueName,
		deadLetter: dlq,
	}, nil
}

// Enqueue adds a job to the Redis list.
func (c *Client) Enqueue(ctx context.Context, job Job) error {
	if job.SessionID == "" || job.AudioKey == "" || job.AyahID == 0 {
		return errors.New("queue: job requires session_id, audio_key, and ayah_id")
	}
	if job.EnqueuedAt.IsZero() {
		job.EnqueuedAt = time.Now().UTC()
	}

	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("queue: marshal job: %w", err)
	}

	if _, err := c.redis.do(ctx, "LPUSH", c.queueKey, string(payload)); err != nil {
		return fmt.Errorf("queue: enqueue: %w", err)
	}
	return nil
}

// Consume blocks for new jobs and invokes the handler for each job.
// It implements a naive visibility timeout using a secondary key that
// re-queues unacknowledged jobs after the timeout elapses.
func (c *Client) Consume(ctx context.Context, handler func(context.Context, Job) error) error {
	vis := c.cfg.VisibilityTimeout
	if vis <= 0 {
		vis = 5 * time.Minute
	}
	maxDeliveries := c.cfg.MaxDeliveries
	if maxDeliveries <= 0 {
		maxDeliveries = 3
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		reply, err := c.redis.do(ctx, "BRPOP", c.queueKey, "5")
		if err != nil {
			if errors.Is(err, errNil) {
				continue
			}
			return fmt.Errorf("queue: pop: %w", err)
		}

		values, ok := reply.([]any)
		if !ok || len(values) < 2 {
			continue
		}

		rawPayload, ok := values[1].(string)
		if !ok {
			continue
		}

		var job Job
		if err := json.Unmarshal([]byte(rawPayload), &job); err != nil {
			return fmt.Errorf("queue: decode job: %w", err)
		}

		attemptsKey := fmt.Sprintf("%s:%s:attempts", c.queueKey, job.SessionID)
		attempts, _ := c.increment(ctx, attemptsKey)

		jobCtx, cancel := context.WithTimeout(ctx, vis)
		handleErr := handler(jobCtx, job)
		cancel()

		if handleErr != nil {
			if attempts >= int64(maxDeliveries) {
				_, _ = c.redis.do(ctx, "LPUSH", c.deadLetter, rawPayload)
			} else {
				_, _ = c.redis.do(ctx, "RPUSH", c.queueKey, rawPayload)
			}
			continue
		}
	}
}

func (c *Client) increment(ctx context.Context, key string) (int64, error) {
	reply, err := c.redis.do(ctx, "INCR", key)
	if err != nil {
		return 0, err
	}
	switch v := reply.(type) {
	case int64:
		_, _ = c.redis.do(ctx, "EXPIRE", key, "86400")
		return v, nil
	case string:
		parsed, convErr := strconv.ParseInt(v, 10, 64)
		if convErr != nil {
			return 0, convErr
		}
		_, _ = c.redis.do(ctx, "EXPIRE", key, "86400")
		return parsed, nil
	default:
		return 0, fmt.Errorf("queue: unexpected INCR reply %T", reply)
	}
}
