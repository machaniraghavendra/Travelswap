package com.travelswap.repository;

import com.travelswap.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, String> {
    List<NotificationEntity> findTop100ByRecipientUserIsNullOrderByCreatedAtDesc();

    List<NotificationEntity> findTop100ByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId);

    List<NotificationEntity> findTop100ByRecipientUserIdAndSeenFalseOrderByCreatedAtDesc(Long recipientUserId);

    Optional<NotificationEntity> findByIdAndRecipientUserId(String id, Long recipientUserId);
}