package com.skillbridge.repository;

import com.skillbridge.model.LearningConnection;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LearningConnectionRepository extends JpaRepository<LearningConnection, Long> {
    List<LearningConnection> findByRequestSenderOrRequestReceiver(User sender, User receiver);
    Optional<LearningConnection> findByRequest(com.skillbridge.model.ExchangeRequest request);
    Optional<LearningConnection> findByIdAndRequestSender(Long id, User sender);
    Optional<LearningConnection> findByIdAndRequestReceiver(Long id, User receiver);
}
