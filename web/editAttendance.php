<link rel="stylesheet" href="css/style.css">

<?php
require("header.php");

header("content-type:text/html; charset=utf-8");

function sameUsers($users1, $users2)
{
    $arr1 = array();
    $users = explode(',', $users1);
    for ($i = 0; $i < count($users); $i++) {
        $arr1[$users[$i]] = 1;
    }

    $users = explode(',', $users2);
    for ($i = 0; $i < count($users); $i++) {
        if ($arr1[$users[$i]] != 1) {
            return false;
        }
    }

    return true;
}

// Check if this is update
$g_post = array();
$g_totalCount = array();
$leaderId = isset($_POST['leaderId'])? mysql_real_escape_string($_POST['leaderId']) : -1;
$group = isset($_POST['group'])? mysql_real_escape_string($_POST['group']) : -1;
//echo $leaderId.'<br>';
foreach ($_POST as $param_name => $param_val) {
    //echo "$param_name=>$param_val<br />\n";
    if ($param_val == 'on') {
        list($userId, $date) = split('_', $param_name);
        $g_post[$date] = $g_post[$date].','.$userId;
    } elseif ($param_val > 0 && strrpos($param_name, '-')) {
        $g_totalCount[$param_name] = $param_val;
    }
}

reset($g_post);
while (list($date, $users) = each($g_post)) {
    $users = mysql_real_escape_string(substr($users, 1));
    $date = mysql_real_escape_string($date);
    $row = getRow("SELECT users FROM attendance WHERE date='$date' AND `group`=$group ORDER BY submitDate DESC LIMIT 1");
    $existingUsers = substr($row[0], 1, -1);
    //echo $row[0]."|".$row[1]."<br>";
    //echo $existingUsers.'|'.$totalCount.'<br>';
    //echo $users.'<br>';
    if (!sameUsers($existingUsers, $users)) {
        getQuery("INSERT INTO attendance(date, `group`, leader, users) VALUES('$date', $group, $leaderId, '[$users]')");
        //echo "INSERT INTO attendance(date, `group`, leader, users) VALUES('$date', $group, $leaderId, '[$users]')<br>";
    }
}

// Update totalUsers if needed
reset($g_totalCount);
while (list($date, $count) = each($g_totalCount)) {
    $row = getRow("SELECT id, totalUsers FROM attendance WHERE date='$date' AND `group`=$group ORDER BY submitDate DESC LIMIT 1");
    //echo "SELECT id, totalUsers FROM attendance WHERE date='$date' AND `group`=$group ORDER BY submitDate DESC LIMIT 1<br>";
    $totalCount = $g_totalCount[$date];
    if (!$row) {
        getQuery("INSERT INTO attendance(date, `group`, leader, users, totalUsers) VALUES('$date', $group, $leaderId, '[]', $totalCount)");
    } elseif ($row[1] != $totalCount) {
        $id = $row[0];
        getQuery("UPDATE attendance SET totalUsers=$totalCount WHERE id=$id");
    }
}


// Get user roles
$g_users = array();
$result = getQuery("SELECT users.id, roles.name as role, users.name, users.cname FROM roles INNER JOIN users ON users.role=roles.id");
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $name = $line['cname'].' '. $line['name'];
    $roleName = $line['role'];
    if (strlen($roleName) > 0) {
        $g_users[$line['id']] = "$name ($roleName)";
    } else {
        $g_users[$line['id']] = $name;
    }
    //echo $line['id'].'>>'.$g_users[$line['id']]."<br>";
}

function showLeaderMeetingAttendance()
{
    global $class;
    global $g_users;
    echo "<h4>同工小组LM(周六)<br>";

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

    echo "<form method='post'><table border=1><tr><td style='min-width: 300px;' align='center'><input type='submit' value='修改小组#0'><input type='hidden' name='group' value='0'><input type='hidden' name='leaderId' value='292'>";
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
            if (!isUserInGroupOnDate($userId, 0, $date)) {
                echo "<td>";
            } else {
                if (strpos($users, $userId.',') === false) {
                    $checkHtml = '';
                } else {
                    $checkHtml = "checked";
                }
                $checkBoxName = $userId.'_'.$date;
                echo "<td align='center'><input type='checkbox' name='$checkBoxName' $checkHtml>";
            }
        }
        $id++;
    }

    echo "<tr><td>出席总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = substr_count($users, ',');
        echo "<td align='center'>$count";
    }

    $totalCountByDate = array();
    echo "<tr><td>注册总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = $totalUsers[$date];
        $totalCountByDate[$date] = $count;
        $textName = $date;
        echo "<td align='center'><input type='text' name='$textName' size='2' value='$count'>";
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

$classAttendAdults = array();
$classTotalAdults = array();
$classAttendChildren = array();
$classTotalChildren = array();

$query = "select distinct `group` from users where class=$class order by `group` asc";
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $group = $line["group"];
    if ($group == 0) {
        echo "<h4>同工小组(周一)<br>";
    } elseif ($group < 100) {
        echo "<h4>成人小组#".$group."<br>";
    } elseif ($group < 200) {
        echo "<h4>儿童小组#".$group."<br>";
    } else {
        echo "<h4>卫星小组#".$group."<br>";
    }
    $leaderId = getLeaderId($group);
    
    // get all member names
    $members = getMembers($class, $group);

    $attend = array();
    $totalUsers = array();
    $query = "select * from attendanceDates where class=$class order by date asc";
    $result2 = mysql_query($query) or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result2, MYSQL_ASSOC)) {
        $date = $line["date"];
        // find attendance by group
        $row = getRow("select users, totalUsers from attendance where `date`='$date' and `group`=$group order by submitDate desc limit 1");
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

    echo "<form method='post'><table border=1><tr><td style='min-width: 300px;' align='center'><input type='submit' value='修改小组#$group'><input type='hidden' name='group' value='$group'><input type='hidden' name='leaderId' value='$leaderId'>";
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
            if (!isUserInGroupOnDate($userId, $group, $date)) {
                echo "<td>";
            } else {
                if (strpos($users, $userId.',') === false) {
                    $checkHtml = '';
                } else {
                    $checkHtml = "checked";
                }
                $checkBoxName = $userId.'_'.$date;
                echo "<td align='center'><input type='checkbox' name='$checkBoxName' $checkHtml>";
            }
        }
        $id++;
    }

    echo "<tr><td>出席总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = substr_count($users, ',');
        if ($group < 100) {
            $classAttendAdults[$date] = (isset($classAttendAdults[$date])? $classAttendAdults[$date] : 0) + $count;
        } elseif ($group < 200) {
            $classAttendChildren[$date] = (isset($classAttendChildren[$date])? $classAttendChildren[$date] : 0) + $count;
        }
        echo "<td align='center'>$count";
    }

    $totalCountByDate = array();
    echo "<tr><td>注册总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = $totalUsers[$date];
        $totalCountByDate[$date] = $count;
        if ($group < 100) {
            $classTotalAdults[$date] = (isset($classTotalAdults[$date])? $classTotalAdults[$date] : 0) + $count;
        } else {
            $classTotalChildren[$date] = (isset($classTotalChildren[$date])? $classTotalChildren[$date] : 0) + $count;
        }
        $textName = $date;
        echo "<td align='center'><input type='text' name='$textName' size='2' value='$count'>";
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

    echo "</table></form>";
}
mysql_free_result($result);

echo "<br><br><b>全班成人总计</b>";
echo "<table border=1><tr><td style='min-width: 300px;'>";
$idx = 0;
reset($classAttendAdults);
while (list($date, $count) = each($classAttendAdults)) {
    list($year, $month, $day) = split('[/.-]', $date);
    echo "<td width='30' align='center'>#$idx<br>$month/$day";
    $idx++;
}

echo "<tr><td>出席总人数:";
reset($classAttendAdults);
while (list($date, $count) = each($classAttendAdults)) {
    $count = $classAttendAdults[$date];
    echo "<td align='center'>$count";
}

echo "<tr><td>注册总人数:";
reset($classTotalAdults);
while (list($date, $count) = each($classTotalAdults)) {
    $count = $classTotalAdults[$date];
    echo "<td align='center'>$count";
}

echo "<tr><td>(%)百分比:";
reset($classAttendAdults);
while (list($date, $count) = each($classAttendAdults)) {
    $total = isset($classTotalAdults[$date])? $classTotalAdults[$date]: 0;
    if ($total == 0) {
        $percent = 0;
    } else {
        $percent = round($count / $total * 100);
    }
    echo "<td align='center'>$percent%";
}

echo "</table>";

echo "<br><br><b>全班儿童总计</b>";
echo "<table border=1><tr><td style='min-width: 300px;'>";
$idx = 0;
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    list($year, $month, $day) = split('[/.-]', $date);
    echo "<td width='30' align='center'>#$idx<br>$month/$day";
    $idx++;
}

echo "<tr><td>出席总人数:";
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    echo "<td align='center'>$count";
}

echo "<tr><td>注册总人数:";
$classTotalAdults = array();
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    $count = $classTotalChildren[$date];
    $classTotalAdults[$date] = $count;
    echo "<td align='center'>$count";
}

echo "<tr><td>(%)百分比:";
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    $total = $classTotalAdults[$date];
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
