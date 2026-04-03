package com.travelswap.controller;

import com.travelswap.dto.TicketListingResponse;
import com.travelswap.dto.UserDashboardResponse;
import com.travelswap.dto.UserTicketResponse;
import com.travelswap.model.NotificationMessage;
import com.travelswap.security.CurrentUserService;
import com.travelswap.service.JourneyService;
import com.travelswap.service.NotificationService;
import com.travelswap.service.TicketMarketplaceService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users/me")
@PreAuthorize("hasRole('USER')")
public class UserPortalController {

    private final TicketMarketplaceService ticketMarketplaceService;
    private final JourneyService journeyService;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    public UserPortalController(
            TicketMarketplaceService ticketMarketplaceService,
            JourneyService journeyService,
            NotificationService notificationService,
            CurrentUserService currentUserService
    ) {
        this.ticketMarketplaceService = ticketMarketplaceService;
        this.journeyService = journeyService;
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/dashboard")
    public UserDashboardResponse dashboard() {
        return ticketMarketplaceService.userDashboard();
    }

    @GetMapping("/listings")
    public List<TicketListingResponse> myListings() {
        return ticketMarketplaceService.sellerTrail();
    }

    @GetMapping("/purchases")
    public List<TicketListingResponse> myPurchases() {
        return ticketMarketplaceService.purchasedTickets();
    }

    @GetMapping("/tickets")
    public List<UserTicketResponse> myTickets() {
        return journeyService.myTickets();
    }

    @GetMapping("/notifications")
    public List<NotificationMessage> myNotifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "30") int limit
    ) {
        Long userId = currentUserService.requireCurrentUser().getId();
        return notificationService.latestForUser(userId, unreadOnly, limit);
    }

    @PatchMapping("/notifications/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markSeen(@PathVariable String notificationId) {
        Long userId = currentUserService.requireCurrentUser().getId();
        notificationService.markSeen(notificationId, userId);
    }
}
