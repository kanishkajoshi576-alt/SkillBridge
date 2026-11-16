package com.skillbridge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "skills", uniqueConstraints = @UniqueConstraint(columnNames = "name"), indexes = @Index(name = "idx_skills_category", columnList = "category"))
public class Skill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, length = 60)
    private String category = "Other";
    protected Skill() {}
    public Skill(String name) { this.name = name; }
    public Skill(String name, String category) { this.name = name; this.category = category; }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
}
