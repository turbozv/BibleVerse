<link rel="stylesheet" href="css/style.css">

<?php
require("header.php");

header("content-type:text/html; charset=utf-8");

// Get user roles
$g_users = getUsers();

function showLeaderMeetingAttendance()
{
    global $class;
    global $g_users;
    echo "<h4>同工小组LM(周六)<br>";

    $results = array();
    $result = getQuery("select id from users where class=$class and role != 255 order by role, cname asc");
    $members = array();
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $members[$line['id']] = $g_users[$line['id']];
    }
    mysql_free_result($result);
    
    $attend = array();
    $result = getQuery("select * from attendanceLeadersMeetingDates where class=$class order by date asc");
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $date = mysql_real_escape_string($line["date"]);
        // find attendance by group
        $row = getRow("select users, totalUsers from attendance where `date`='$date' order by submitDate desc limit 1");
        if ($row === false) {
            $attend[$date] = "";
            $totalUsers[$date] = 0;
        } else {
            if ($row[0] == "[]") {
                $attend[$date] = "";
            } else {
                $attend[$date] = substr($row[0], 1, -1).',';
            }
            $totalUsers[$date] = $row[1];
        }
        //echo "$date => $attend[$date] totalUsers: $totalUsers[$date]<br>";
    }
    mysql_free_result($result);

    echo "<table border=1><tr><td style='min-width: 280px;'>";
    $idx = 0;
    while (list($date, $users) = each($attend)) {
        list($year, $month, $day) = split('[/.-]', $date);
        echo "<td width='30' align='center'>#$idx<br>$month/$day";
        $idx++;
    }

    reset($members);
    $id = 1;
    while (list($userId, $name) = each($members)) {
        echo "<tr><td>$id. $name (<a href='users.php?user=$userId'>#$userId</a>)";
        reset($attend);
        while (list($date, $users) = each($attend)) {
            if (strpos($users, $userId.',') === false) {
                if (!isUserInGroupOnDate($userId, 0, $date)) {
                    $check = '-';
                }
                else {
                    $check = '';
                }
            } else {
                $check = '√';
            }

            echo "<td align='center'>$check";
            $results[0][$userId][$date] = $check;
        }
        $id++;
    }

    echo "<tr><td>出席总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = 0;
        foreach ($results[0] as $user => $value) {
            if ($value[$date] == '√') {
                $count++;
            }
        }
        echo "<td align='center'>$count";
    }

    $totalCountByDate = array();
    echo "<tr><td>注册总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = 0;
        foreach ($results[0] as $user => $value) {
            if ($value[$date] != '-') {
                $count++;
            }
        }
        $totalCountByDate[$date] = $count;
        echo "<td align='center'>$count";
    }

    echo "<tr><td>(%)百分比:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = substr_count($users, ',');
        $totalCount = $totalCountByDate[$date];
        if ($totalCount == 0) {
            $percent = 0;
        } else {
            $percent = round($count / $totalCount * 100);
        }
        echo "<td align='center'>$percent%";
    }

    echo "</table>";
}

$class = $_SESSION['classId'];
$row = getRow("select name from class where id=$class");
echo "<h3>出席表 Class: $row[0]</h3>";

showLeaderMeetingAttendance();

$classAttend = array();
$classTotal = array();

$groups = getAdultGroups($class);
$results = array();
foreach ($groups as $key => $group) {
    echo "<h4>".getGroupDisplayName($class, $group)."<br>";
    $leaderId = getLeaderId($group);
    
    // get all member names (who has ever in this group)
    $members = getMembers($class, $group);

    $attend = getAttendanceDates($class, $group);

    echo "<table border=1><tr><td style='min-width: 280px;'>";
    $idx = 0;
    while (list($date, $users) = each($attend)) {
        list($year, $month, $day) = split('[/.-]', $date);
        echo "<td width='30' align='center'>#$idx<br>$month/$day";
        $idx++;
    }

    reset($members);
    $id = 1;
    while (list($userId, $name) = each($members)) {
        echo "<tr><td>$id. $name (<a href='users.php?user=$userId'>#$userId</a>)";
        reset($attend);
        while (list($date, $users) = each($attend)) {
            if (strpos($users, $userId.',') === false) {
                if (!isUserInGroupOnDate($userId, $group, $date)) {
                    $check = '-';
                } else {
                    $check = '';
                }
            } else {
                $check = '√';
            }            
            echo "<td align='center'>$check";
            $results[$group][$userId][$date] = $check;
        }
        $id++;
    }

    echo "<tr><td>出席总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = 0;
        foreach ($results[$group] as $user => $value) {
            if ($value[$date] == '√') {
                $count++;
            }
        }
        $total = (isset($classAttend[$date])? $classAttend[$date] : 0) + $count;
        $classAttend[$date] = $total;
        echo "<td align='center'>$count";
    }

    $totalCountByDate = array();
    echo "<tr><td>注册总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = 0;
        foreach ($results[$group] as $user => $value) {
            if ($value[$date] != '-') {
                $count++;
            }
        }
        $totalCountByDate[$date] = $count;
        $total = (isset($classTotal[$date])? $classTotal[$date] : 0) + $count;
        $classTotal[$date] = $total;
        echo "<td align='center'>$count";
    }

    echo "<tr><td>(%)百分比:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = substr_count($users, ',');
        $totalCount = $totalCountByDate[$date];
        if ($totalCount == 0) {
            $percent = 0;
        } else {
            $percent = round($count / $totalCount * 100);
        }
        echo "<td align='center'>$percent%";
    }

    echo "</table>";
}

echo "<br><br><b>全班成人总计</b>";
echo "<table border=1><tr><td style='min-width: 280px;'>";
$idx = 0;
reset($classAttend);
while (list($date, $count) = each($classAttend)) {
    list($year, $month, $day) = split('[/.-]', $date);
    echo "<td width='30' align='center'>#$idx<br>$month/$day";
    $idx++;
}

echo "<tr><td>出席总人数:";
reset($classAttend);
while (list($date, $count) = each($classAttend)) {
    $count = $classAttend[$date];
    echo "<td align='center'>$count";
}

echo "<tr><td>注册总人数:";
reset($classTotal);
while (list($date, $count) = each($classTotal)) {
    $count = $classTotal[$date];
    echo "<td align='center'>$count";
}

echo "<tr><td>(%)百分比:";
reset($classAttend);
while (list($date, $count) = each($classAttend)) {
    $total = isset($classTotal[$date])? $classTotal[$date]: 0;
    if ($total == 0) {
        $percent = 0;
    } else {
        $percent = round($count / $total * 100);
    }
    echo "<td align='center'>$percent%";
}

echo "</table>";
require("footer.php");
?>
