package com.skillbridge.repository;

import com.skillbridge.model.ExchangeRequest;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExchangeRequestRepository extends JpaRepository<ExchangeRequest, Long> {
    List<ExchangeRequest> findBySenderOrReceiverOrderByCreatedAtDesc(User sender, User receiver);
    List<ExchangeRequest> findBySenderAndReceiver(User sender, User receiver);
    boolean existsBySenderAndReceiverAndStatus(User sender, User receiver, String status);
}
