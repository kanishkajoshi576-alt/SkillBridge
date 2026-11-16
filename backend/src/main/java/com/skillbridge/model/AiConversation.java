package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ai_conversations")
public class AiConversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected AiConversation() {}
    public AiConversation(User user, String title) { this.user = user; this.title = title; }
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void rename(String title) { this.title = title; updatedAt = Instant.now(); }
    public void touch() { updatedAt = Instant.now(); }
}
