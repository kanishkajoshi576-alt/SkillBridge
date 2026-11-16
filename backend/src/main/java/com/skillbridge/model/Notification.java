package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notifications_user_read_created", columnList = "user_id, is_read, created_at"))
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Column(nullable = false, length = 40)
    private String type;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(nullable = false, length = 500)
    private String message;
    @Column(nullable = false)
    private boolean isRead = false;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected Notification() {}
    public Notification(User user, String type, String title, String message) {
        this.user = user; this.type = type; this.title = title; this.message = message;
    }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public boolean isRead() { return isRead; }
    public Instant getCreatedAt() { return createdAt; }
    public void markRead() { isRead = true; }
}
