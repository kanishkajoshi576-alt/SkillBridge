package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "community_comments", indexes = @Index(name = "idx_community_comments_post_created", columnList = "post_id, created_at"))
public class CommunityComment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "post_id")
    private CommunityPost post;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "author_id")
    private User author;
    @Column(nullable = false, length = 1000)
    private String body;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected CommunityComment() {}
    public CommunityComment(CommunityPost post, User author, String body) { this.post = post; this.author = author; this.body = body; }
    public Long getId() { return id; }
    public CommunityPost getPost() { return post; }
    public User getAuthor() { return author; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
