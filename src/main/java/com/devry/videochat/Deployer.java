/**
 * Deployer.java
 * 
 * Deploy Vert.x verticle with configuration set in configuration.json.
 * 
 * @author Gwowen Fu
 *
 */
package com.devry.videochat;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.DeploymentOptions;
import io.vertx.core.VertxOptions;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.core.logging.SLF4JLogDelegateFactory;

public class Deployer extends AbstractVerticle {

    private static Logger logger = LoggerFactory.getLogger(Deployer.class);

    @Override
    public void start() throws Exception {
        logger.debug("Main verticle has started, let's deploy some others...");

        int port = config().getInteger("http.port", 8943);
        int instnaces = config().getInteger("total.instances", 1);
        boolean ha = config().getBoolean("high.availability", false);
        String keystorePath = config().getString("keystore.path", "keystore.jks");
        String keystorePass = config().getString("keystore.pass", "password");

        logger.debug("port=" + port);
        logger.debug("instnaces=" + instnaces);
        logger.debug("ha=" + ha);
        
        vertx.deployVerticle("com.devry.videochat.VideoChatVerticle", 
            new DeploymentOptions().setInstances(instnaces).setHa(ha).setConfig(
                    new JsonObject().put("http.port", port)
                    .put("keystore.path", keystorePath)
                    .put("keystore.pass", keystorePass)));
    }
    
}