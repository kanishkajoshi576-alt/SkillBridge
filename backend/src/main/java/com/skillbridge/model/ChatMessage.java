package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_messages_connection_created", columnList = "connection_id, created_at"),
        @Index(name = "idx_messages_sender_created", columnList = "sender_id, created_at")
})
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "connection_id")
    private LearningConnection connection;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "sender_id")
    private User sender;
    @Column(nullable = false, length = 4000)
    private String message;
    @Column(nullable = false)
    private boolean isRead = false;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected ChatMessage() {}
    public ChatMessage(LearningConnection connection, User sender, String message) { this.connection = connection; this.sender = sender; this.message = message; }
    public Long getId() { return id; }
    public LearningConnection getConnection() { return connection; }
    public User getSender() { return sender; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isRead() { return isRead; }
    public void markRead() { isRead = true; }
}
