package com.travelswap.controller;

import com.travelswap.dto.CreateListingRequest;
import com.travelswap.dto.MarketplaceSummaryResponse;
import com.travelswap.dto.ProviderInfoResponse;
import com.travelswap.dto.PurchaseRequest;
import com.travelswap.dto.TicketListingResponse;
import com.travelswap.dto.UpdatePriceRequest;
import com.travelswap.model.ListingStatus;
import com.travelswap.model.NotificationMessage;
import com.travelswap.service.NotificationService;
import com.travelswap.service.StreamingService;
import com.travelswap.service.TicketMarketplaceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api")
public class TicketMarketplaceController {

    private final TicketMarketplaceService ticketMarketplaceService;
    private final NotificationService notificationService;
    private final StreamingService streamingService;

    public TicketMarketplaceController(
            TicketMarketplaceService ticketMarketplaceService,
            NotificationService notificationService,
            StreamingService streamingService
    ) {
        this.ticketMarketplaceService = ticketMarketplaceService;
        this.notificationService = notificationService;
        this.streamingService = streamingService;
    }

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('USER')")
    public TicketListingResponse createListing(@Valid @RequestBody CreateListingRequest request) {
        return ticketMarketplaceService.createListing(request);
    }

    @GetMapping("/listings")
    public List<TicketListingResponse> listListings(
            @RequestParam Optional<ListingStatus> status,
            @RequestParam Optional<String> routeFrom,
            @RequestParam Optional<String> routeTo,
            @RequestParam Optional<LocalDate> journeyDate
    ) {
        return ticketMarketplaceService.getListings(status, routeFrom, routeTo, journeyDate);
    }

    @GetMapping("/listings/{listingId}")
    public TicketListingResponse getListing(@PathVariable long listingId) {
        return ticketMarketplaceService.getListing(listingId);
    }

    @PatchMapping("/listings/{listingId}/price")
    @PreAuthorize("hasRole('USER')")
    public TicketListingResponse updateListingPrice(@PathVariable long listingId, @Valid @RequestBody UpdatePriceRequest request) {
        BigDecimal nextPrice = request.resalePrice();
        return ticketMarketplaceService.updatePrice(listingId, nextPrice);
    }

    @PostMapping("/listings/{listingId}/purchase")
    @PreAuthorize("hasRole('USER')")
    public TicketListingResponse purchase(@PathVariable long listingId, @Valid @RequestBody PurchaseRequest purchaseRequest) {
        return ticketMarketplaceService.purchase(listingId, purchaseRequest);
    }

    @DeleteMapping("/listings/{listingId}")
    @PreAuthorize("hasRole('USER')")
    public TicketListingResponse revoke(@PathVariable long listingId) {
        return ticketMarketplaceService.revokeListing(listingId);
    }

    @GetMapping("/summary")
    public MarketplaceSummaryResponse summary() {
        return ticketMarketplaceService.summary();
    }

    @GetMapping("/providers")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ProviderInfoResponse> providers() {
        return ticketMarketplaceService.providers();
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasRole('ADMIN')")
    public List<NotificationMessage> notifications(@RequestParam(defaultValue = "30") int limit) {
        return notificationService.latestSystem(limit);
    }

    @GetMapping("/stream/listings")
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamListings() {
        return streamingService.subscribe();
    }
}
