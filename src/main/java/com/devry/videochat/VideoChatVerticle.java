/**
 * VideoChatVerticle.java
 * 
 * A WebRTC signaling server build with Vert.x library.
 * 
 * @author Gwowen Fu
 *
 */
package com.devry.videochat;

import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.MessageConsumer;
import io.vertx.core.http.HttpServerOptions;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.http.ServerWebSocket;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.core.net.JksOptions;
import io.vertx.core.shareddata.LocalMap;
import io.vertx.core.shareddata.SharedData;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.StaticHandler;

public class VideoChatVerticle extends AbstractVerticle {

    private static final Logger logger = LoggerFactory.getLogger(VideoChatVerticle.class);
    private static final Pattern urlPattern = Pattern.compile("/");
    private static final String UPDATE_CALLER_COUNT_EVENT = "update.caller.count.event";
    private static final String CALLER_WAITING_MAP = "caller_waiting_map";
    private static LocalMap<String, String> callerWaitingMap = null;
    private static EventBus eventBus = null;
    private SharedData sharedData = null;

    @Override
    public void start(Future<Void> fut) throws Exception {
        logger.debug("Verticle started " + Thread.currentThread().getName());
        final int port = config().getInteger("http.port", 8543);
        final String keystorePath = config().getString("keystore.path", "keystore.jks");
        final String keystorePass = config().getString("keystore.pass", "password");
        logger.debug("Port: " + port);
        callerWaitingMap = vertx.sharedData().getLocalMap(CALLER_WAITING_MAP);
        eventBus = vertx.eventBus();
        sharedData = vertx.sharedData();

        // Create a router object.
        Router router = Router.router(vertx);

        // Bind "/" to our hello message - so we are still compatible.
        router.route("/").handler(routingContext -> {
            HttpServerResponse response = routingContext.response();
            response.putHeader("content-type", "text/html")
                    .end("<h1>Hello from DeVry Video Chat Signaling Server!</h1>");
        });
        // Serve static resources from the /assets directory
        router.route("/client/*").handler(StaticHandler.create("client"));

        HttpServerOptions options = new HttpServerOptions().setSsl(true).setWebsocketSubProtocols("wss")
                .setKeyStoreOptions(new JksOptions().setPath(keystorePath).setPassword(keystorePass));

        vertx.createHttpServer(options).websocketHandler(webSocket -> {
            logger.debug("New client connected: " + ((ServerWebSocket) webSocket).remoteAddress());
            logger.debug("path= " + webSocket.path());
            logger.debug("uri= " + webSocket.uri());
            logger.debug("localAddress= " + webSocket.localAddress());
            logger.debug("textHandlerID= " + webSocket.textHandlerID());

            final Matcher m = urlPattern.matcher(webSocket.path());
            if (!m.matches()) {
                webSocket.reject();
                return;
            }

            webSocket.handler(new Handler<Buffer>() {
                public void handle(Buffer data) {
                    JsonObject jsonObj = data.toJsonObject();
                    processMessage(webSocket, jsonObj);
                }
            });

        }).requestHandler(router::accept)
            .listen(port, result -> {
                if (result.succeeded()) {
                    fut.complete();
                } else {
                    fut.fail(result.cause());
                }
            });
    }

    @Override
    public void stop(Future<Void> stopFuture) {
        logger.debug("Verticle stopped " + Thread.currentThread().getName());
    }

    private void processMessage(ServerWebSocket socket, JsonObject jsonObj) {
        String type = jsonObj.containsKey("type") ? jsonObj.getString("type") : "";
        String username = jsonObj.containsKey("username") ? jsonObj.getString("username") : "";
        String callerId = jsonObj.containsKey("callerId") ? jsonObj.getString("callerId")
                : System.currentTimeMillis() + "-" + username;

        if (username.length() == 0) {
            jsonObj.put("type", "error").put("message", "Missing username");
            socket.writeFinalTextFrame(jsonObj.toString());
            return;
        }

        if (sharedData == null) {
            logger.debug("SharedData is null. CallerId = " + callerId);
            return;
        }
        
        LocalMap<String, String> callerMap = sharedData.getLocalMap(callerId);

        if (callerMap == null) {
            logger.debug("Not able to get local map for caller ID " + callerId);
            return;
        }
                
        switch (type) {
        
        case "advisorLogin": // Advisor login
            MessageConsumer<String> updateConsumer = eventBus.consumer(UPDATE_CALLER_COUNT_EVENT, message -> {
                JsonObject json = new JsonObject();
                json.put("type", "updateWaitingCallerCount");
                json.put("waitingCallerCount", callerWaitingMap.size());
                socket.writeFinalTextFrame(json.toString());
            });

            // Handle WebRTC messages
            MessageConsumer<String> regularConsumer = eventBus.consumer(socket.textHandlerID(), message -> {
                socket.writeFinalTextFrame(message.body().toString());
            });

            // Exit user from the call because other caller left
            MessageConsumer<String> leaveConsumer = eventBus.consumer("LEAVE_EVENT", message -> {
                logger.debug("advisorLogin leaves: " + message.body());
                JsonObject json = new JsonObject(message.body().toString());
                String localCallerId = json.getString("callerId");
                String currentSocketId = socket.textHandlerID();
                
                LocalMap<String, String> localCallerMap = sharedData.getLocalMap(localCallerId);
                Optional<String> optional = localCallerMap.keySet().stream().filter(targetSocketId -> currentSocketId.compareTo(targetSocketId) == 0).findFirst();
                if (optional.isPresent()) {
                    socket.writeFinalTextFrame(message.body().toString());  
                }                    
            });
           
            jsonObj.put("waitingCallerCount", callerWaitingMap.size());
            socket.writeFinalTextFrame(jsonObj.toString());
            logger.debug("Advisor " + username + " logged in - " + callerId);

            socket.closeHandler(v -> {
                updateConsumer.unregister();
                regularConsumer.unregister();
                leaveConsumer.unregister();
            });

            break;

        case "call": // Student makes a call
            callerMap.put(socket.textHandlerID(), "_host_");
            callerWaitingMap.put(callerId, socket.textHandlerID());

            eventBus.publish(UPDATE_CALLER_COUNT_EVENT, callerId);
            MessageConsumer<String> studentRegularConsumer = eventBus.consumer(socket.textHandlerID(), message -> {
                socket.writeFinalTextFrame(message.body().toString());
            });

            MessageConsumer<String> studentLeaveConsumer = eventBus.consumer("LEAVE_EVENT", message -> {
                logger.debug("Student leaves: " + message.body());
                JsonObject json = new JsonObject(message.body().toString());
                if (json.getString("callerId").compareToIgnoreCase(callerId) == 0) {
                    socket.writeFinalTextFrame(message.body().toString());                    
                }
            });

            jsonObj.put("success", "true");
            jsonObj.put("callerId", callerId);
            socket.writeFinalTextFrame(jsonObj.toString());
            logger.debug("Student " + username + " called in - " + callerId);

            socket.closeHandler(v -> {
                studentRegularConsumer.unregister();
                studentLeaveConsumer.unregister();
            });

            break;

        case "callList": // Return list of students that are still waiting
            jsonObj.put("value", getCallList(callerWaitingMap));
            socket.writeFinalTextFrame(jsonObj.toString());
            break;

        case "join": // Advisor joins a call from student
            if (callerMap.isEmpty()) {
                jsonObj.put("success", "false").put("value", "Call does not exist");
            } else {
                // Keep the caller and remove joined socket since it is no
                // longer needed, this is used to save the screen sharing socket
                callerMap.keySet().forEach(key -> {
                    if (!callerMap.get(key).startsWith("_host_")) {
                        callerMap.remove(key);
                    }
                });
                
                callerMap.put(socket.textHandlerID(), username);
                jsonObj.put("success", "true");
            }

            if (callerWaitingMap.remove(callerId) != null) {
                eventBus.publish(UPDATE_CALLER_COUNT_EVENT, callerId);
            }

            socket.writeFinalTextFrame(jsonObj.toString());
            logger.debug("Advisor " + username + " joined - " + callerId);
            break;

        case "leave":
            if (callerWaitingMap.remove(callerId) != null) {
                eventBus.publish(UPDATE_CALLER_COUNT_EVENT, callerId);
            }
            eventBus.publish("LEAVE_EVENT", jsonObj.toString());
            logger.debug(username + " left - " + callerId);
            break;

        case "offer":
        case "answer":
        case "candidate":
            processMessage(callerMap, socket, callerId, jsonObj);
            break;

        default:
            socket.writeFinalTextFrame("{\"type\":\"error\", \"message\":\"Unrecognized command: " + type + "\"}");

        }

    }

    private void processMessage(LocalMap<String, String> callerMap, ServerWebSocket currentSocket, String callerId,
            JsonObject jsonObj) {
        String currentSocketId = currentSocket.textHandlerID();

        callerMap.keySet().forEach(targetSocketId -> {
            if (currentSocketId != targetSocketId) {
                vertx.eventBus().send(targetSocketId, jsonObj.toString());
            }
        });
    }

    private JsonObject getCallList(LocalMap<String, String> callerWaitingMap) {
        Set<String> callerWaitingSet = callerWaitingMap.keySet();
        JsonObject jsonObj = new JsonObject();

        callerWaitingSet.forEach(callerId -> {
            jsonObj.put(callerId, new JsonArray().add(callerId.split("-")[1]));
        });

        return jsonObj;
    }

}