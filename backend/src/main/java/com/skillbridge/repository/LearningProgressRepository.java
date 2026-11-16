package com.skillbridge.repository;

import com.skillbridge.model.LearningProgress;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, Long> {
    List<LearningProgress> findByUserOrderByIdDesc(User user);
    Optional<LearningProgress> findByIdAndUser(Long id, User user);
}
