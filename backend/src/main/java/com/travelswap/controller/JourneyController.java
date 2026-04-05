package com.travelswap.controller;

import com.travelswap.dto.BookSeatRequest;
import com.travelswap.dto.JourneyResponse;
import com.travelswap.dto.JourneySeatResponse;
import com.travelswap.dto.UserTicketResponse;
import com.travelswap.service.JourneyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

@RestController
@RequestMapping("/api")
public class JourneyController {

    private final JourneyService journeyService;

    public JourneyController(JourneyService journeyService) {
        this.journeyService = journeyService;
    }

    @GetMapping("/journeys")
    @PreAuthorize("hasRole('USER')")
    public List<JourneyResponse> openJourneys(
            @RequestParam Optional<String> routeFrom,
            @RequestParam Optional<String> routeTo,
            @RequestParam Optional<LocalDate> journeyDate
    ) {
        return journeyService.openJourneys(routeFrom, routeTo, journeyDate);
    }

    @GetMapping("/journeys/locations")
    @PreAuthorize("hasAnyRole('USER','TRAVEL','ADMIN')")
    public List<String> locations() {
        return journeyService.availableLocations();
    }

    @GetMapping("/journeys/{journeyId}/seats")
    @PreAuthorize("hasRole('USER')")
    public JourneySeatResponse seatPlan(@PathVariable Long journeyId) {
        return journeyService.seatPlan(journeyId);
    }

    @PostMapping("/journeys/{journeyId}/book")
    @PreAuthorize("hasRole('USER')")
    public List<UserTicketResponse> book(@PathVariable Long journeyId, @Valid @RequestBody BookSeatRequest request) {
        return journeyService.bookSeat(journeyId, request);
    }
}
