<?php
require("header.php");
header("content-type:text/html; charset=utf-8");
$userId = isset($_GET['user'])? $_GET['user']: -1;

if (isset($_POST['action'])) {
    if ($_POST['action'] == 'edit' && isset($_POST['user']) && isset($_POST['name']) && isset($_POST['cname']) && isset($_POST['group']) && isset($_POST['role']) && isset($_POST['email']) && isset($_POST['cellphone'])) {
        $id = mysql_real_escape_string($_POST['user']);
        $name = mysql_real_escape_string($_POST['name']);
        $cname = mysql_real_escape_string($_POST['cname']);
        $email = mysql_real_escape_string($_POST['email']);
        $cellphone = mysql_real_escape_string($_POST['cellphone']);
        $group = mysql_real_escape_string($_POST['group']);
        $role = mysql_real_escape_string($_POST['role']);

        getQuery("UPDATE users SET name='$name', cname='$cname', email='$email', cellphone='$cellphone', `group`='$group', role='$role' WHERE id='$id'");
        //echo "UPDATE users SET name='$name', cname='$cname', `group`='$group', role='$role' WHERE id='$id'";
        echo "<font color='red'>Updated!</font>";
    }

    if ($_POST['action'] == 'new' && isset($_POST['name']) && isset($_POST['cname']) && isset($_POST['group']) && isset($_POST['role']) && isset($_POST['email']) && isset($_POST['cellphone'])) {
        $name = mysql_real_escape_string($_POST['name']);
        $cname = mysql_real_escape_string($_POST['cname']);
        $email = mysql_real_escape_string($_POST['email']);
        $cellphone = mysql_real_escape_string($_POST['cellphone']);
        $group = mysql_real_escape_string($_POST['group']);
        $role = mysql_real_escape_string($_POST['role']);

        getQuery("INSERT users(name, cname, email, cellphone, `group`, role) VALUES('$name', '$cname', '$email', '$cellphone', '$group', '$role')");
        $userId = mysql_insert_id();
        echo "<font color='red'>Created!</font>";
    }

    if ($_POST['action'] == 'remove' && isset($_POST['user'])) {
        $id = mysql_real_escape_string($_POST['user']);
        if ($id != -1) {
            getQuery("DELETE FROM users WHERE id='$id'");
            //echo "DELETE users WHERE id='$id'";
            $userId = -1;
            echo "<font color='red'>Removed!</font>";
        }
    }
}

?>
  <form method='get'>
    <p>Select user:
      <select name='user' onchange='this.form.submit()'>
      <?php
    $users = getUsers();
    asort($users);
    $index = 1;
    foreach ($users as $key => $value) {
        if ($userId == -1) {
            $userId = $key;
        }
        $param = '';
        if ($userId == $key) {
            $param = " selected='selected'";
        }
        $id = $index++;
        echo "<option value='$key'$param>$id. $value (#$key)</option>";
    }
?>
      </select>
    </p>
  </form>

<?php
$user = getUser($userId);
?>
  <hr>
  <h3>Edit user</h3>
  <form method='post'>
    <input type='hidden' name='action' value='edit'>
    <input type='hidden' name='user' value='<?php echo $user['id'];?>'>
    <p>Name:
    <input type='text' name='name' value='<?php echo $user['name']?>'>
    <p>CName:
    <input type='text' name='cname' value='<?php echo $user['cname']?>'>
    <p>Cellphone:
    <input type='text' name='cellphone' value='<?php echo $user['cellphone']?>'>
    <p>Email:
    <input type='text' name='email' value='<?php echo $user['email']?>'>
    <p>Group:
    <select name='group'>
    <?php
        $groups = getGroups();
        $class = mysql_real_escape_string($_SESSION['classId']);
        foreach ($groups as $key => $value) {
            $param = '';
            if ($user['group'] == $key) {
                $param = " selected='selected'";
            }
            $groupDisplayName = getGroupDisplayName($class, $value);
            echo "<option value='$key'$param>$groupDisplayName</option>";
        } ?>
      </select>
    </select>
    <p>Role:
      <select name='role'>
      <?php
        $roles = getRoles();
        foreach ($roles as $key => $value) {
            $param = '';
            if ($user['role'] == $key) {
                $param = " selected='selected'";
            }
            if ($value == "") {
                $value = "(N/A)";
            }
            echo "<option value='$key'$param>$value</option>";
        } ?>
      </select>
    </p>

    <input type='submit'>
  </form>

  <hr>
  <h3>New user</h3>
  <form method='post'>
    <input type='hidden' name='action' value='new'>
    <p>Name:
    <input type='text' name='name' value=''>
    <p>CName:
    <input type='text' name='cname' value=''>
    <p>Cellphone:
    <input type='text' name='cellphone' value=''>
    <p>Email:
    <input type='text' name='email' value=''>
    <p>Group:
    <select name='group'>
    <?php
        reset($groups);
        foreach ($groups as $key => $value) {
            $groupDisplayName = getGroupDisplayName($class, $value);
            echo "<option value='$key'>$groupDisplayName</option>";
        } ?>
      </select>
    </select>
    <p>Role:
      <select name='role'>
      <?php
        reset($roles);
        foreach ($roles as $key => $value) {
            if ($value == "") {
                $value = "(N/A)";
            }
            echo "<option value='$key'>$value</option>";
        } ?>
      </select>
    </p>

    <input type='submit'>
  </form>

  <hr>
  <h3>Remove user: <?php echo $user['cname']." ".$user['name']." (#".$user['id'].")";?></h3>
  <form method='post'>
    <input type='hidden' name='action' value='remove'>
    <input type='hidden' name='user' value='<?php echo $user['id'];?>'>
    <input type='submit'>
  </form>
  <p>
<?php
require("footer.php");
?>
