# signaling-server


### Executing Command


Use default logback.xml
-----------------------
java -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar start --java-opts="-Dvertx.logger-delegate-factory-class-name=io.vertx.core.logging.SLF4JLogDelegateFactory" -conf configuration.json --redirect-output > out.log

java -jar signaling-server-0.0.1-SNAPSHOT-fat.jar start --java-opts="-Dvertx.logger-delegate-factory-class-name=io.vertx.core.logging.SLF4JLogDelegateFactory" -conf configuration.json --redirect-output > out.log


Connect to JConsole
-------------------
java -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar start --java-opts="-Dcom.sun.management.jmxremote=true -Dcom.sun.management.jmxremote.local.only=false -Dvertx.logger-delegate-factory-class-name=io.vertx.core.logging.SLF4JLogDelegateFactory" -conf configuration.json --redirect-output > out.log


Remote debugging
----------------
java -Xdebug -Xrunjdwp:transport=dt_socket,address=8888,server=y,suspend=y -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar start --java-opts="-Dvertx.logger-delegate-factory-class-name=io.vertx.core.logging.SLF4JLogDelegateFactory -Dvertx.options.blockedThreadCheckInterval=100000" -conf configuration.json --redirect-output > out.log


Clustering
----------
java -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar start --java-opts="-Dvertx.logger-delegate-factory-class-name=io.vertx.core.logging.SLF4JLogDelegateFactory" -conf configuration.json --redirect-output -cluster > out.log

java -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar start --java-opts="-Dvertx.logger-delegate-factory-class-name=io.vertx.core.logging.SLF4JLogDelegateFactory" -conf configuration.json -cluster -cluster-host 127.0.0.1 -cluster-port 5701 ---redirect-output > out.log

### Notes

There is a “mapping” between system properties and Vert.x Options as in:
-Dvertx.options.workerPoolSize=20 

The deployment options of the main verticle can also be configured from system properties:
-Dvertx.deployment.options.worker=true

The Launcher class supports a couple of options such as:
- worker
- cluster
- ha
- instances
- conf

You can get the complete list by launching fat jar with -h:
java -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar -h -> Get the list of Launcher command
java -jar target/signaling-server-0.0.1-SNAPSHOT-fat.jar run -h -> Get the Run command options (run is the default command)

Clustering
----------
Vert.x and Hazelcast
Ideally, all you need to do is run your Vert.x program (called vertice ) with the -cluster option, and everything may run correctly. Vertx achieved automatic node discovery thanks to Hazelcast, which exploits multicasting to automatically detect new nodes.

But sometimes, this easy solution just does not work, because of the specificities of your network. In such a case, you first want to edit the conf/logging.properties file to set-up logging level for hazelcast to INFO. This is extremely useful, as Hazelcast will then show you how it discovers other nodes, and the current state of the network with every active node.

Then, two issues may happen: nodes are not discovered, or nodes are discovered but vert.x messages are not transfered from one node to another.

The solution I've found to solve both issues is to edit the cluster.xml configure file as described below. Once you have edited it, make sure that Vert.x indeed reads this file when you launch it ! I guarantee that by copying cluster.xml into the current directory, where I launch the local vert.x program.

With this solution, the order in which you launch each vertice is important: I hereafter call server the vert.x node that is launched first, and client a vert.x node that is launched afterwards on another machine and that requires the bus to have already been created by the server.

First, the server:

In cluster.xml, disable multicast
In cluster.xml, enable tcp-ip, and add one interface = the local (server) IP
Run your vert.x node with only the -cluster option

Then, the client on another machine:

In cluster.xml, disable multicast
In cluster.xml, enable tcp-ip, and add one interface = the distant server IP
(so in fact, this cluster.xml is exactly the same as on the server)
Run your vert.x node with both the -cluster and -cluster-host local_IP options, where local_IP is the IP address of the client
This way, Hazelcast will not use multicast, but will use tcp-ip to directly connect to the single Vert.x bus on the server, which must already be running (otherwise, a new independent bus will be created on the client).