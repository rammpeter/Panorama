Panorama
========

Web-tool for monitoring performance issues of Oracle databases.
Provides easy access to several internal information.<br>
Aims to issues that are inadequately analyzed and presented by other existing tools such as Enterprise Manager.

<b>RubyOnRails-Application:</b>
- immmediately startable as Java war-File with built-in Jetty application Server. ( java -jar Panorama.war )
- may be deployed as web application to every JEE or web container (Glassfish, JBoss, Tomcat ...) 

<b>Preconditions for Server machine:</b>
- if using tnsnames.ora it should be in $ORACLE_HOME/network/admin or below $TNS_ADMIN 
- Java runtime environment Java 6 or 7
- Installed Java Cryptography Extension (JCE).<br>
If JCE is not installed you will get this error:<br>
Illegal key size: possibly you need to install Java Cryptography Extension (JCE) Unlimited Strength Jurisdiction Policy Files for your JRE<br>
JCE files for Oracle-JVM are available here: http://www.oracle.com/technetwork/java/javase/downloads/index.html<br>
JCE-Files for IBM JVM are available here: http://pic.dhe.ibm.com/infocenter/java7sdk/v7r0/index.jsp?topic=%2Fcom.ibm.java.security.component.70.doc%2Fsecurity-component%2Fintroduction.html
