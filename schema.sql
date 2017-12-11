-- MySQL dump 10.13  Distrib 5.1.73, for redhat-linux-gnu (x86_64)
--
-- Host: localhost    Database: cbsf
-- ------------------------------------------------------
-- Server version	5.1.73

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary table structure for view `AverageResponseTime`
--

DROP TABLE IF EXISTS `AverageResponseTime`;
/*!50001 DROP VIEW IF EXISTS `AverageResponseTime`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `AverageResponseTime` (
 `AveResponseTime(ms)` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `DistinctDeviceIdPlatformOSView`
--

DROP TABLE IF EXISTS `DistinctDeviceIdPlatformOSView`;
/*!50001 DROP VIEW IF EXISTS `DistinctDeviceIdPlatformOSView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `DistinctDeviceIdPlatformOSView` (
 `deviceId` tinyint NOT NULL,
  `platformOS` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `FeedbackView`
--

DROP TABLE IF EXISTS `FeedbackView`;
/*!50001 DROP VIEW IF EXISTS `FeedbackView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `FeedbackView` (
 `id` tinyint NOT NULL,
  `date` tinyint NOT NULL,
  `ip` tinyint NOT NULL,
  `deviceId` tinyint NOT NULL,
  `lang` tinyint NOT NULL,
  `platformOS` tinyint NOT NULL,
  `deviceYearClass` tinyint NOT NULL,
  `version` tinyint NOT NULL,
  `bibleVersion` tinyint NOT NULL,
  `comment` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `LogView`
--

DROP TABLE IF EXISTS `LogView`;
/*!50001 DROP VIEW IF EXISTS `LogView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `LogView` (
 `id` tinyint NOT NULL,
  `date` tinyint NOT NULL,
  `cost` tinyint NOT NULL,
  `ip` tinyint NOT NULL,
  `path` tinyint NOT NULL,
  `deviceId` tinyint NOT NULL,
  `sessionId` tinyint NOT NULL,
  `lang` tinyint NOT NULL,
  `platformOS` tinyint NOT NULL,
  `deviceYearClass` tinyint NOT NULL,
  `text` tinyint NOT NULL,
  `version` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `PlatformOSView`
--

DROP TABLE IF EXISTS `PlatformOSView`;
/*!50001 DROP VIEW IF EXISTS `PlatformOSView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `PlatformOSView` (
 `Platform` tinyint NOT NULL,
  `Devices` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `TotalUniqueDeviceCount`
--

DROP TABLE IF EXISTS `TotalUniqueDeviceCount`;
/*!50001 DROP VIEW IF EXISTS `TotalUniqueDeviceCount`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `TotalUniqueDeviceCount` (
 `DeviceCount` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `UniqueDeviceCountPerDay`
--

DROP TABLE IF EXISTS `UniqueDeviceCountPerDay`;
/*!50001 DROP VIEW IF EXISTS `UniqueDeviceCountPerDay`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `UniqueDeviceCountPerDay` (
 `Date` tinyint NOT NULL,
  `DeviceCount` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `answers`
--

DROP TABLE IF EXISTS `answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `answers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `device` varchar(255) CHARACTER SET latin1 NOT NULL,
  `answer` text CHARACTER SET latin1 NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`,`device`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip` varchar(255) COLLATE utf8_bin NOT NULL,
  `deviceId` varchar(100) COLLATE utf8_bin NOT NULL,
  `lang` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `platformOS` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `deviceYearClass` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `version` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `bibleVersion` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `comment` text COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`id`),
  KEY `deviceId` (`deviceId`),
  KEY `date` (`date`),
  KEY `ip` (`ip`)
) ENGINE=MyISAM AUTO_INCREMENT=531 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log`
--

DROP TABLE IF EXISTS `log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cost` int(11) NOT NULL,
  `ip` varchar(255) COLLATE utf8_bin NOT NULL,
  `path` varchar(255) COLLATE utf8_bin NOT NULL,
  `deviceId` varchar(255) COLLATE utf8_bin NOT NULL,
  `sessionId` varchar(255) COLLATE utf8_bin NOT NULL,
  `lang` varchar(255) COLLATE utf8_bin NOT NULL,
  `platformOS` varchar(255) COLLATE utf8_bin NOT NULL,
  `deviceYearClass` varchar(255) COLLATE utf8_bin NOT NULL,
  `text` text COLLATE utf8_bin NOT NULL,
  `version` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `deviceId` (`deviceId`),
  KEY `lang` (`lang`),
  KEY `version` (`version`),
  KEY `date` (`date`)
) ENGINE=MyISAM AUTO_INCREMENT=237639 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `date` datetime NOT NULL,
  `name` char(255) CHARACTER SET latin1 NOT NULL,
  `pass` char(255) CHARACTER SET latin1 NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `AverageResponseTime`
--

/*!50001 DROP TABLE IF EXISTS `AverageResponseTime`*/;
/*!50001 DROP VIEW IF EXISTS `AverageResponseTime`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_bin */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `AverageResponseTime` AS select (((select sum(`log`.`cost`) from `log`) / (select count(0) from `log`)) + 'ms') AS `AveResponseTime(ms)` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `DistinctDeviceIdPlatformOSView`
--

/*!50001 DROP TABLE IF EXISTS `DistinctDeviceIdPlatformOSView`*/;
/*!50001 DROP VIEW IF EXISTS `DistinctDeviceIdPlatformOSView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `DistinctDeviceIdPlatformOSView` AS select distinct `log`.`deviceId` AS `deviceId`,`log`.`platformOS` AS `platformOS` from `log` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `FeedbackView`
--

/*!50001 DROP TABLE IF EXISTS `FeedbackView`*/;
/*!50001 DROP VIEW IF EXISTS `FeedbackView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `FeedbackView` AS select `feedback`.`id` AS `id`,`feedback`.`date` AS `date`,`feedback`.`ip` AS `ip`,`feedback`.`deviceId` AS `deviceId`,`feedback`.`lang` AS `lang`,`feedback`.`platformOS` AS `platformOS`,`feedback`.`deviceYearClass` AS `deviceYearClass`,`feedback`.`version` AS `version`,`feedback`.`bibleVersion` AS `bibleVersion`,`feedback`.`comment` AS `comment` from `feedback` order by `feedback`.`date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `LogView`
--

/*!50001 DROP TABLE IF EXISTS `LogView`*/;
/*!50001 DROP VIEW IF EXISTS `LogView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `LogView` AS select `log`.`id` AS `id`,`log`.`date` AS `date`,`log`.`cost` AS `cost`,`log`.`ip` AS `ip`,`log`.`path` AS `path`,`log`.`deviceId` AS `deviceId`,`log`.`sessionId` AS `sessionId`,`log`.`lang` AS `lang`,`log`.`platformOS` AS `platformOS`,`log`.`deviceYearClass` AS `deviceYearClass`,`log`.`text` AS `text`,`log`.`version` AS `version` from `log` order by `log`.`date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `PlatformOSView`
--

/*!50001 DROP TABLE IF EXISTS `PlatformOSView`*/;
/*!50001 DROP VIEW IF EXISTS `PlatformOSView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `PlatformOSView` AS select `DistinctDeviceIdPlatformOSView`.`platformOS` AS `Platform`,count(0) AS `Devices` from `DistinctDeviceIdPlatformOSView` group by `DistinctDeviceIdPlatformOSView`.`platformOS` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `TotalUniqueDeviceCount`
--

/*!50001 DROP TABLE IF EXISTS `TotalUniqueDeviceCount`*/;
/*!50001 DROP VIEW IF EXISTS `TotalUniqueDeviceCount`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_bin */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `TotalUniqueDeviceCount` AS select count(distinct `log`.`deviceId`) AS `DeviceCount` from `log` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `UniqueDeviceCountPerDay`
--

/*!50001 DROP TABLE IF EXISTS `UniqueDeviceCountPerDay`*/;
/*!50001 DROP VIEW IF EXISTS `UniqueDeviceCountPerDay`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_bin */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `UniqueDeviceCountPerDay` AS select cast(`log`.`date` as date) AS `Date`,count(distinct `log`.`deviceId`) AS `DeviceCount` from `log` where (`log`.`date` >= '2017-9-11') group by cast(`log`.`date` as date) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-12-11 15:39:27
