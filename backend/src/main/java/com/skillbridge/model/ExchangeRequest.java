package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "exchange_requests", indexes = {
        @Index(name = "idx_exchange_sender_created", columnList = "sender_id, created_at"),
        @Index(name = "idx_exchange_receiver_status", columnList = "receiver_id, status"),
        @Index(name = "idx_exchange_status_created", columnList = "status, created_at")
})
public class ExchangeRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "sender_id")
    private User sender;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "receiver_id")
    private User receiver;
    @Column(length = 1000)
    private String message;
    @Column(nullable = false, length = 20)
    private String status = "PENDING";
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    private Instant respondedAt;
    protected ExchangeRequest() {}
    public ExchangeRequest(User sender, User receiver, String message) { this.sender = sender; this.receiver = receiver; this.message = message; }
    public Long getId() { return id; }
    public User getSender() { return sender; }
    public User getReceiver() { return receiver; }
    public String getMessage() { return message; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public void respond(String status) {
        if (!"PENDING".equals(this.status) || !("ACCEPTED".equals(status) || "REJECTED".equals(status))) {
            throw new IllegalStateException("This exchange request can no longer be answered.");
        }
        this.status = status;
        this.respondedAt = Instant.now();
    }
    public void cancel() {
        if (!"PENDING".equals(status)) throw new IllegalStateException("Only pending requests can be cancelled.");
        status = "CANCELLED";
        respondedAt = Instant.now();
    }
}
