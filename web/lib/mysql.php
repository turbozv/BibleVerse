<?php

date_default_timezone_set($db_timezone);

$link = mysql_connect($db_server, $db_user, $db_password) or die('Could not connect: ' . mysql_error());
mysql_select_db($db_name) or die('Could not select database');
mysql_query("set names utf8mb4;");


function getQuery($sql)
{
    $result =  mysql_query($sql) or die('Query failed: ' . mysql_error());
    return $result;
}

function getRow($sql)
{
    $result = mysql_query($sql) or die('Query failed: ' . mysql_error());
    $row = mysql_fetch_row($result);
    mysql_free_result($result);
    return $row;
}

function getRowArray($sql)
{
    $result = mysql_query($sql) or die('Query failed: ' . mysql_error());
    $row = mysql_fetch_array($result);
    mysql_free_result($result);
    return $row;
}

function getLeaderId($group)
{
    $result = mysql_query("select leader from attendanceLeaders where `group`=$group") or die('Query failed: ' . mysql_error());
    $row = mysql_fetch_row($result);
    return $row[0];
}

function getClassIds()
{
    $classIds = array();
    $result = mysql_query("select id, name from class order by id desc") or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $classIds[$line['id']] = $line['name'];
    }
    return $classIds;
}

function getMembers($class, $group)
{
    global $g_users;
    $members = array();
    $class = mysql_real_escape_string($class);
    $group = mysql_real_escape_string($group);
    if ($group == 0) {
        $result = getQuery("select id from users where class=$class and role NOT IN (6,255) order by role, cname asc");
    } else if ($group == 1000) {
        $result = getQuery("select id from users where class=$class and role !=255 order by role, cname asc");
    } else {
        // 6 - GL shows first
        $result = getQuery("select id from users where class=$class and `group`=$group order by FIELD(role, '255', '6') desc, registerDate asc, cname asc");
    }
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $members[$line['id']] = $g_users[$line['id']];
    }
    mysql_free_result($result);

    // also include the groups the user ever has been
    if ($group != 0) {
        $result = getQuery("select user from userGroups where class=$class and `group`=$group");
        while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
            //echo $line['user'].'<br>';
            $members[$line['user']] = $g_users[$line['user']];
        }
        mysql_free_result($result);
    }

    return $members;
}

function getUser($userId)
{
    $user = mysql_real_escape_string($userId);
    return getRowArray("SELECT * FROM users WHERE id=$user");
}

function getUsers()
{
    $class = mysql_real_escape_string($_SESSION['classId']);
    $users = array();
    $result = getQuery("SELECT users.id, roles.name as role, users.name, users.cname FROM roles INNER JOIN users ON users.role=roles.id AND class=$class");
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $name = $line['name'];
        $cname = $line['cname'];
        if (strlen($name) == 0) {
            $name = $cname;
        } else if (strlen($cname) > 0) {
            $name .= ' '.$cname;
        }
        $roleName = $line['role'];
        if (strlen($roleName) > 0) {
            $users[$line['id']] = trim("$name ($roleName)");
        } else {
            $users[$line['id']] = trim($name);
        }
        //echo $line['id'].'>>'.$users[$line['id']]."<br>";
    }

    return $users;
}

function getGroups()
{
    $class = mysql_real_escape_string($_SESSION['classId']);
    $groups = array();
    $result = getQuery("select distinct `group` from users where class=$class order by `group` asc");
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $groups[$line['group']] = $line['group'];
    }

    return $groups;
}

function getRoles()
{
    $roles = array();
    $result = getQuery("SELECT id, name FROM roles WHERE id > 0 ORDER BY id DESC");
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $roles[$line['id']] = $line['name'];
    }

    return $roles;
}

function getUsersAttendance($date, $groupType)
{
    $date = mysql_real_escape_string($date);
    $attendance = array();
    $totalUsers = array();
    $groups = array();
    $result = getQuery("select * from attendance where date='$date' order by submitDate desc");
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $group = $line['group'];
        if (isset($groups[$group])) {
            continue;
        }
        $groups[$group] = 1;

        if ($groupType == 'adult' && $group >= 100) {
            continue;
        }
        if ($groupType == 'sp' && $group < 100 || $group >= 200) {
            continue;
        }
        if ($groupType == 'satellite' && $group < 500) {
            continue;
        }

        $users = explode(',', substr($line['users'], 1, -1));
        foreach ($users as $user) {
            $attendance[$user] = 1;
            $totalUsers[$group] = $line['totalUsers'];
        }

        //echo $line['id'].'>>'.$line['group'].' ' .$line['users']." <br>";
    }

    //echo "Total attendance: ".sizeof($attendance)."<br>";
    //print_r($attendance);
    $result = array();
    $result['users'] = $attendance;
    $result['totalUsers'] = $totalUsers;
    return $result;
}

function isUserInGroupOnDate($user, $group, $date)
{
    $row = getRow("SELECT id FROM users WHERE id=$user AND DATE(registerDate) <= '$date'");
    if (!$row) {
        return false;
    }

    $row = getRow("SELECT id FROM userGroups WHERE user=$user AND `group`=$group");
    if (!$row) {
        return true;
    }

    $row = getRow("SELECT id FROM userGroups WHERE user=$user AND `group`=$group AND fromDate <= '$date' AND endDate >= '$date'");
    return !!$row;
}

$g_groupName = array();

function getGroupDisplayName($class, $group) {
    global $g_groupName;

    if (sizeof($g_groupName) == 0) {
        $result = getQuery("select class, groupId, name from groups");
        while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
            $key = mysql_real_escape_string($line["class"])."-".mysql_real_escape_string($line["groupId"]);
            $g_groupName[$key] = mysql_real_escape_string($line["name"]);
        }
        mysql_free_result($result);
    }

    $key = $class."-".$group;
    if (array_key_exists($key, $g_groupName))
        return $g_groupName[$key]."#".$group;

    $result = "";
    $groupValue = intval($group);
    if ($groupValue == 0) {
        return "同工小组(周一)";
    }

    if ($groupValue < 100) {
        return "成人小组#".$group;
    }

    if ($groupValue < 500) {
        return "儿童小组#".$group;
    }

    if ($groupValue < 600) {
        return "卫星小组#".$group;
    }
    
    return "其他小组1#".$group;
}

function getAdultGroups($class) {
    $groups = array();

    $query = "select distinct `group` from users where class=$class and `group` < 100 order by `group` asc";
    $result = mysql_query($query) or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        array_push($groups, $line["group"]);
    }

    mysql_free_result($result);

    return $groups;
}

function getSPGroups($class) {
    $groups = array();

    $query = "select distinct `group` from users where class=$class and `group` >= 100 and `group` < 200 order by `group` asc ";
    $result = mysql_query($query) or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        array_push($groups, $line["group"]);
    }

    mysql_free_result($result);

    return $groups;
}

function getSatelightGroups($class) {
    $groups = array();

    $query = "select distinct `group` from users where class=$class and `group` >= 500 and `group` < 600 order by `group` asc";
    $result = mysql_query($query) or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        array_push($groups, $line["group"]);
    }

    mysql_free_result($result);

    return $groups;
}

function getAttendancedates($class, $group) {
    $attendDates = array();

    if ($group == 0) {
        $query = "select date from attendanceDates where class=$class order by date asc";
    } else {
        $query = "SELECT DISTINCT date FROM attendance WHERE class=$class and `group`=$group ORDER BY date ASC";
    }
    $result = mysql_query($query) or die('Query failed: ' . mysql_error());
    $todatValue = date("Ymd");
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $date = $line["date"];
        $dateValue = date("Ymd", strtotime($date));
        if (intval($dateValue) > intval($todatValue)) {
            continue;
        }

        // find attendance by group
        $row = getRow("select users from attendance where `date`='$date' and `group`=$group order by submitDate desc limit 1");
        if ($row === false) {
            $attendDates[$date] = "";
        } else {
            if ($row[0] == "[]") {
                $attendDates[$date] = "";
            } else {
                $attendDates[$date] = substr($row[0], 1, -1).',';
            }
        }
        //echo "$date => $attend[$date]<br>";
    }

    mysql_free_result($result);

    return $attendDates;
}

function getAttendanceReportGroups($class) {
    $groups = array();

    $query = "select distinct `group` from users where class=$class and `group` < 500 order by `group` asc";
    $result = mysql_query($query) or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
        array_push($groups, $line["group"]);
    }

    mysql_free_result($result);
    return $groups;
}
