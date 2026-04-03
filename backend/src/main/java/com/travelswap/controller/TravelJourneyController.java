package com.travelswap.controller;

import com.travelswap.dto.CreateJourneyRequest;
import com.travelswap.dto.JourneyResponse;
import com.travelswap.dto.TravelOverviewResponse;
import com.travelswap.dto.UpdateJourneyRequest;
import com.travelswap.service.JourneyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/travel/journeys")
@PreAuthorize("hasRole('TRAVEL')")
public class TravelJourneyController {

    private final JourneyService journeyService;

    public TravelJourneyController(JourneyService journeyService) {
        this.journeyService = journeyService;
    }

    @GetMapping
    public List<JourneyResponse> myJourneys() {
        return journeyService.myJourneys();
    }

    @GetMapping("/overview")
    public TravelOverviewResponse overview() {
        return journeyService.travelOverview();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JourneyResponse create(@Valid @RequestBody CreateJourneyRequest request) {
        return journeyService.createJourney(request);
    }

    @PutMapping("/{journeyId}")
    public JourneyResponse update(@PathVariable Long journeyId, @Valid @RequestBody UpdateJourneyRequest request) {
        return journeyService.updateJourney(journeyId, request);
    }
}
