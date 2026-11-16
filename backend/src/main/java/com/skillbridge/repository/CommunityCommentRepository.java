package com.skillbridge.repository;

import com.skillbridge.model.CommunityComment;
import com.skillbridge.model.CommunityPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {
    List<CommunityComment> findByPostOrderByCreatedAtAsc(CommunityPost post, Pageable pageable);
    long countByPost(CommunityPost post);
}
