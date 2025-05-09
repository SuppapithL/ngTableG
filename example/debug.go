package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
)

// ResponseWriter wrapper to capture response data
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
	body       *bytes.Buffer
}

func newLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
		body:           bytes.NewBuffer(nil),
	}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func (lrw *loggingResponseWriter) Write(b []byte) (int, error) {
	lrw.body.Write(b)
	return lrw.ResponseWriter.Write(b)
}

// Rename LoggingMiddleware to DebugLoggingMiddleware to avoid conflicts
func DebugLoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log method and URL
		log.Printf("REQUEST: %s %s", r.Method, r.URL.Path)

		// Log Authorization header, but mask the token value for security
		if auth := r.Header.Get("Authorization"); auth != "" {
			if len(auth) > 15 {
				log.Printf("AUTH HEADER: %s...%s", auth[:10], auth[len(auth)-5:])
			} else {
				log.Printf("AUTH HEADER: [too short to mask]")
			}
		}

		// Only log body for POST and PUT
		if r.Method == "POST" || r.Method == "PUT" {
			// Read the body
			var bodyBytes []byte
			if r.Body != nil {
				bodyBytes, _ = io.ReadAll(r.Body)
			}

			// Restore the body
			r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

			// Pretty print JSON
			var prettyJSON bytes.Buffer
			if err := json.Indent(&prettyJSON, bodyBytes, "", "  "); err == nil {
				log.Printf("REQUEST BODY: \n%s", prettyJSON.String())
			} else {
				// Fallback if not valid JSON
				log.Printf("REQUEST BODY: %s", string(bodyBytes))
			}
		}

		// Create a response wrapper to capture the response
		lrw := newLoggingResponseWriter(w)

		// Call the next handler
		next.ServeHTTP(lrw, r)

		// Log the response status code
		log.Printf("RESPONSE: %s %s - Status: %d", r.Method, r.URL.Path, lrw.statusCode)

		// Log the response body for debugging specific endpoints
		if r.URL.Path == "/api/login" || r.URL.Path == "/api/users/me" {
			// Pretty print JSON response if possible
			var prettyJSON bytes.Buffer
			if err := json.Indent(&prettyJSON, lrw.body.Bytes(), "", "  "); err == nil {
				log.Printf("RESPONSE BODY: \n%s", prettyJSON.String())
			} else {
				// Fallback if not valid JSON
				log.Printf("RESPONSE BODY: %s", lrw.body.String())
			}
		}
	})
}
