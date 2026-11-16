package com.skillbridge.repository;

import com.skillbridge.model.Notification;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    Optional<Notification> findByIdAndUser(Long id, User user);
    boolean existsByUserAndTypeAndMessage(User user, String type, String message);
}
