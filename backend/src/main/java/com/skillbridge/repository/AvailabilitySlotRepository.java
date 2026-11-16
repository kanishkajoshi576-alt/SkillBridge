package com.skillbridge.repository;

import com.skillbridge.model.AvailabilitySlot;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, Long> {
    List<AvailabilitySlot> findByUserOrderByDayOfWeekAscStartTimeAsc(User user);
    void deleteByUser(User user);
}
