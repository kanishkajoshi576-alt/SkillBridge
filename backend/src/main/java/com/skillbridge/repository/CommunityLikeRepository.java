package com.skillbridge.repository;

import com.skillbridge.model.CommunityLike;
import com.skillbridge.model.CommunityPost;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityLikeRepository extends JpaRepository<CommunityLike, Long> {
    long countByPost(CommunityPost post);
    boolean existsByPostAndUser(CommunityPost post, User user);
    java.util.Optional<CommunityLike> findByPostAndUser(CommunityPost post, User user);
}
