package com.travelswap.service;

import com.travelswap.entity.NotificationEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.event.ListingLifecycleEvent;
import com.travelswap.exception.ResourceNotFoundException;
import com.travelswap.model.NotificationMessage;
import com.travelswap.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @EventListener
    public void onListingEvent(ListingLifecycleEvent event) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setTitle(event.type().name().replace('_', ' '));
        entity.setDetail(event.message());
        entity.setCategory("SYSTEM");
        entity.setListingId(event.listing() == null ? null : event.listing().id());
        entity.setRecipientUser(null);
        entity.setSeen(false);
        entity.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(entity);
    }

    @Transactional
    public void notifySellerSale(
            UserEntity seller,
            Long listingId,
            String buyerName,
            BigDecimal recoveredAmount,
            BigDecimal lossAmount,
            BigDecimal platformFee,
            BigDecimal travellerCommission,
            BigDecimal buyerFinalPrice
    ) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setTitle("Ticket Sold");
        entity.setDetail(
                "Your ticket was purchased by " + buyerName
                        + ". Recovery: INR " + amount(recoveredAmount)
                        + ", Loss: INR " + amount(lossAmount)
                        + ", Traveller commission: INR " + amount(travellerCommission)
                        + ", Platform fee charged: INR " + amount(platformFee)
                        + ", Buyer paid total: INR " + amount(buyerFinalPrice)
        );
        entity.setCategory("SELLER_REFUND");
        entity.setListingId(listingId);
        entity.setRecipientUser(seller);
        entity.setSeen(false);
        entity.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(entity);
    }

    public List<NotificationMessage> latestSystem(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return notificationRepository.findTop100ByRecipientUserIsNullOrderByCreatedAtDesc()
                .stream()
                .limit(safeLimit)
                .map(this::map)
                .toList();
    }

    public List<NotificationMessage> latestForUser(Long userId, boolean unreadOnly, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));

        List<NotificationEntity> entities = unreadOnly
                ? notificationRepository.findTop100ByRecipientUserIdAndSeenFalseOrderByCreatedAtDesc(userId)
                : notificationRepository.findTop100ByRecipientUserIdOrderByCreatedAtDesc(userId);

        return entities.stream().limit(safeLimit).map(this::map).toList();
    }

    @Transactional
    public void markSeen(String notificationId, Long userId) {
        NotificationEntity entity = notificationRepository.findByIdAndRecipientUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        entity.setSeen(true);
        notificationRepository.save(entity);
    }

    private NotificationMessage map(NotificationEntity entity) {
        return new NotificationMessage(
                entity.getId(),
                entity.getTitle(),
                entity.getDetail(),
                entity.getCategory() == null ? "SYSTEM" : entity.getCategory(),
                entity.getListingId(),
                entity.isSeen(),
                entity.getCreatedAt()
        );
    }

    private String amount(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
