<?php

function noAccess()
{
    echo  "<h1>No sermon recording available</h1>";
    exit;
}

$cellphone = $_GET["cellphone"];
if (!isset($cellphone)) {
    noAccess();
}
if (!is_numeric($cellphone)) {
    noAccess();
}

require("lib/config.php");
require("lib/mysql.php");
$cellphone = mysql_escape_string($cellphone);
$row = getRow("SELECT id FROM users WHERE cellphone='$cellphone' AND audio=1");
if (!$row) {
    noAccess();
}

$row = '1';
$notes = '';
$seminar = '';
if (!isset($_GET["lesson"])) {
    $row = getRow("SELECT message, lesson, notes, seminar FROM LatestAudio LIMIT 1");
    $lesson = $row[1];
    $notes = $row[2];
    $seminar = $row[3];
} else {
    $lesson = mysql_escape_string($_GET["lesson"]);
    $row = getRow("SELECT message, notes, seminar FROM audios WHERE lesson='$lesson' LIMIT 1");
    $notes = $row[1];
    $seminar = $row[2];
}

$lines = split("\n", $row[0]);
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>BSF sermon</title>
  <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'/>
  <link rel='stylesheet prefetch' href='https://cdnjs.cloudflare.com/ajax/libs/mediaelement/2.22.0/mediaelementplayer.min.css'>
  <style>
    @import 'https://fonts.googleapis.com/css?family=Lato';

    * {
      outline: none;
    }

    body {
      font-family: 'Lato';
    }

    body:after {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      z-index: -1;
      content: url(play.svg) url(pause.svg);
    }

    article {
      position: absolute;
      width: 98%;
      margin: auto;
      text-align: center;
      padding: 0px 5%;
      box-sizing: border-box;
      border-radius: 10px;
    }

    .cont {
      margin-bottom: 0px;
    }

    .cont h3 {
      font-family: 'Lato';
      font-size: 17px;
      font-weight: 'boild';
      margin: 0 0 0px 0;
      color: rgb(54, 52, 52);
    }

    .cont time {
      font-family: 'Lato';
      font-size: 10px;
      color: rgb(43, 39, 39);

    }

    .mejs-container {
      font-family: Helvetica, Arial;
      text-align: left;
      vertical-align: top;
      text-indent: 0;
      width: 100% !important;
      height: 50px !important;
      border-radius: 5px;
    }

    .mejs-container .mejs-controls {
      height: 100%;
      background: transparent;
      display: flex;
    }

    .mejs-controls .mejs-time-rail span,
    .mejs-controls .mejs-time-rail a {
      display: block;
      width: 180px;
      height: 100%;
      border-radius: 0px;
      cursor: pointer;
    }

    .mejs-controls div.mejs-time-rail {
      padding-top: initial;
      height: 100%;
    }

    .mejs-controls .mejs-time-rail .mejs-time-total {
      margin: 0
    }

    .mejs-container .mejs-controls .mejs-time {
      display: block;
      height: 27px;
      width: auto;
      padding: 0;
      line-height: 25px;
      overflow: hidden;
      text-align: center;
      -moz-box-sizing: content-box;
      -webkit-box-sizing: content-box;
      box-sizing: content-box;
    }

    .mejs-container .mejs-controls .mejs-time {
      position: absolute;
      right: 10px;
      bottom: 0;
      top: 0;
      margin: auto;
      font-family: 'Lato';
      font-size: 32px;
      pointer-events: none;
    }

    .mejs-controls .mejs-time-rail .mejs-time-float-corner {
      display: none;
    }

    .mejs-controls .mejs-time-rail .mejs-time-float {
      position: absolute;
      width: 46px;
      height: 20px;
      border: none;
      top: -25px;
      margin-left: -18px;
      text-align: center;
      border-radius: 3px;
    }

    .mejs-controls .mejs-time-rail .mejs-time-float-current {
      margin: 0;
      margin-top: 4px;
      width: 100%;
      display: block;
      text-align: center;
      left: 0;
    }

    .mejs-container .mejs-controls div {
      height: 100%;
      width: 50px;
      position: relative;
    }

    .mejs-controls .mejs-button button {
      margin: 0;
      padding: 0;
      position: relative;
      height: 100%;
      width: 100%;
      border: 0 !important;
      background: transparent;
      outline: none;
    }

    .mejs-controls .mejs-play:after {
      position: absolute;
      content: "";
      background: url(play.svg) no-repeat;
      width: 17px;
      height: 22px;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      margin: auto;
      transition: all 100ms linear;
      pointer-events: none;
    }

    .mejs-controls .mejs-pause:after {
      position: absolute;
      content: "";
      background: url(pause.svg) no-repeat;
      width: 13px;
      height: 22px;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      margin: auto;
      transition: all 100ms linear;
      pointer-events: none;
    }

    .mejs-controls .mejs-time-rail .mejs-time-loaded {
      background-size: 50px 50px;
      animation: move 3s linear infinite;
      opacity: 0.1;
    }

    .mejs-controls .mejs-time-rail .mejs-time-current {
      background: linear-gradient(to right, #F7A800, #F7A800);
    }

    .mejs-controls .mejs-button button:focus {
      outline: none;
    }

    @-webkit-keyframes move {
      0% {
        background-position: 0 0;
      }
      100% {
        background-position: 50px 50px;
      }
    }
  </style>

  <script src='https://cdnjs.cloudflare.com/ajax/libs/mediaelement/2.22.0/jquery.js'></script>
  <script src='https://cdnjs.cloudflare.com/ajax/libs/mediaelement/2.22.0/mediaelement-and-player.min.js'></script>
</head>

<body oncontextmenu="return false">
  <article>
    <div class="cont">
      <h3><?php echo $lines[0];?>
      <h3><?php echo $lines[1];?>
      <ul style='text-align: left;'>
<?php
for ($i=2; $i<count($lines); $i++) {
    echo "<li>".$lines[$i];
}
?>
      </ul>
    </div>
    <audio class="audio" controls="controls" controlsList="nodownload">
      <source type="audio/mpeg" src="http://mycbsf.org:3000/audio/<?php echo $cellphone;?>?lesson=<?php echo $lesson;?>&play=1">
    </audio>

<?php 
if (trim($notes) != '') {
    ?>
    <p>
    <div class="cont">
      <h3>讲义录音：
    </div>
    <audio class="audio" controls="controls" controlsList="nodownload">
      <source type="audio/mpeg" src="http://mycbsf.org:3000/audio/<?php echo $cellphone; ?>?lesson=<?php echo $lesson; ?>&playNotes=1">
    </audio>
<?php
}

?>
<?php 
if (trim($seminar) != '') {
    ?>
    <p>
    <div class="cont">
      <h3>讲座录音：
    </div>
    <audio class="audio" controls="controls" controlsList="nodownload">
      <source type="audio/mpeg" src="http://mycbsf.org:3000/audio/<?php echo $cellphone; ?>?lesson=<?php echo $lesson; ?>&playSeminar=1">
    </audio>
<?php
}
?>
<div class="cout">
<p style="font-size: 12px;">
Men's Evening Class, BELLEVUE (CHINESE) WA
</p>
</div>
  </article>

  <script>
    jQuery(document).ready(function ($) {
      if ($.fn.mediaelementplayer) {
        $("audio").mediaelementplayer({
          success: function (mediaElement, domObject) {
            mediaElement.setVolume(1.0);
          }
        });
      }
    });

    $('audio').mediaelementplayer({
      features: ['playpause', 'progress', 'current', 'tracks']
    });
  </script>
</body>

</html>
