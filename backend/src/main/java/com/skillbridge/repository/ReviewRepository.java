package com.skillbridge.repository;

import com.skillbridge.model.LearningConnection;
import com.skillbridge.model.Review;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByReviewerAndConnection(User reviewer, LearningConnection connection);
    List<Review> findByReviewedUserOrderByCreatedAtDesc(User user);
}
