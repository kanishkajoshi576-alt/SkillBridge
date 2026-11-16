package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "community_posts", indexes = {
        @Index(name = "idx_community_posts_created", columnList = "status, created_at"),
        @Index(name = "idx_community_posts_author_created", columnList = "author_id, created_at")
})
public class CommunityPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "author_id")
    private User author;
    @Column(nullable = false, length = 3000)
    private String body;
    @Column(length = 100)
    private String skillTag;
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected CommunityPost() {}
    public CommunityPost(User author, String body, String skillTag) { this.author = author; this.body = body; this.skillTag = skillTag; }
    @PreUpdate void touch() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public User getAuthor() { return author; }
    public String getBody() { return body; }
    public String getSkillTag() { return skillTag; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public void edit(String body, String skillTag) { this.body = body; this.skillTag = skillTag; }
    public void remove() { this.status = "REMOVED"; }
}
