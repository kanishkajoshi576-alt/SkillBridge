package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"reviewer_id", "connection_id"}))
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "reviewer_id")
    private User reviewer;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "reviewed_user_id")
    private User reviewedUser;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "connection_id")
    private LearningConnection connection;
    @Column(nullable = false)
    private int rating;
    @Column(length = 1200)
    private String reviewText;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected Review() {}
    public Review(User reviewer, User reviewedUser, LearningConnection connection, int rating, String reviewText) {
        this.reviewer = reviewer; this.reviewedUser = reviewedUser; this.connection = connection;
        this.rating = rating; this.reviewText = reviewText;
    }
    public Long getId() { return id; }
    public User getReviewer() { return reviewer; }
    public User getReviewedUser() { return reviewedUser; }
    public int getRating() { return rating; }
    public String getReviewText() { return reviewText; }
    public Instant getCreatedAt() { return createdAt; }
}
