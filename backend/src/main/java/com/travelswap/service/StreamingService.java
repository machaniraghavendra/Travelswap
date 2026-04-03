package com.travelswap.service;

import com.travelswap.dto.ListingStreamEventResponse;
import com.travelswap.event.ListingLifecycleEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class StreamingService {

    private static final Logger log = LoggerFactory.getLogger(StreamingService.class);

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(error -> {
            log.debug("SSE emitter removed on error: {}", error == null ? "unknown" : error.getMessage());
            emitters.remove(emitter);
        });

        sendToEmitter(emitter, SseEmitter.event()
                .data(new ListingStreamEventResponse("CONNECTED", "Live updates connected", null, LocalDateTime.now())));

        return emitter;
    }

    @EventListener
    public void onListingEvent(ListingLifecycleEvent event) {
        ListingStreamEventResponse payload = new ListingStreamEventResponse(
                event.type().name(),
                event.message(),
                event.listing(),
                LocalDateTime.now()
        );

        emitters.forEach(emitter -> sendToEmitter(emitter, SseEmitter.event().data(payload)));
    }

    private void sendToEmitter(SseEmitter emitter, SseEmitter.SseEventBuilder eventBuilder) {
        try {
            emitter.send(eventBuilder);
        } catch (IOException | IllegalStateException exception) {
            log.debug("SSE emitter send failed: {}", exception.getMessage());
            emitter.complete();
            emitters.remove(emitter);
        }
    }
}
