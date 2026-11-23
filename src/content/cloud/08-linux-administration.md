---
title: Linux Administration for Engineers
summary: The everyday work of keeping Linux servers healthy — setting up and hardening SSH, users and sudo, installing and patching packages, disks and filesystems (partitions, LVM, mounting, fstab), log rotation, time sync, scheduled jobs, backups you've actually restored, and configuration management so servers are reproducible rather than hand-crafted.
---

## The server nobody dared to touch

> [!STORY] Every company has one: a server set up by someone who left years ago. It runs something important, nobody knows exactly how it was configured, it hasn't been patched since 2019 because "last time we updated, something broke", its disk fills up every few months, and its backups have never been tested. When it finally dies, recovering takes a week of archaeology. Good Linux administration is about making servers **boring**: secure by default, patched automatically, monitored, backed up, and reproducible from code.

The Linux track teaches the command line itself. This chapter covers the **operational** tasks that come with running servers — whether that's a fleet of VMs, Kubernetes nodes, or one important box.

## First hour on a new server

A checklist many teams automate:

1. **Update everything:** `sudo apt update && sudo apt upgrade` (Debian/Ubuntu) or `sudo dnf upgrade` (RHEL/Fedora/Amazon Linux).
2. **Create named user accounts** with sudo; don't share logins.
3. **Lock down SSH** (below).
4. **Turn on the firewall**, allowing only needed ports (Networking track, chapter 12).
5. **Enable automatic security updates.**
6. **Set the time zone to UTC and enable time sync.**
7. **Install monitoring and log shipping agents** (Cloud track, chapter 7).

## SSH: the front door

```text
# /etc/ssh/sshd_config  (then: sudo systemctl reload ssh)
PermitRootLogin no               # log in as yourself, then sudo
PasswordAuthentication no        # keys only — password guessing becomes impossible
PubkeyAuthentication yes
AllowGroups ssh-users            # only members of this group may log in
```

- Use **key pairs** (`ssh-keygen -t ed25519`), with the private key protected by a passphrase or kept in a hardware key.
- Put keys in `~/.ssh/authorized_keys` for each user, with permissions 700 on `.ssh` and 600 on the file.
- Internet-facing SSH gets scanned constantly; tools like **fail2ban** block repeat offenders, but the strongest options are no public SSH at all: a **bastion host**, a VPN, or the cloud's session manager (AWS SSM, GCP IAP) that needs no open port.
- In large fleets, **SSH certificates** (short-lived, signed by a central authority) replace copying public keys everywhere.

> [!ANALOGY] Password SSH is a front door with a combination lock that the whole internet can try, all day. Key-only SSH is a door that only opens for a specific physical key. A session manager is having no street-facing door at all — you enter through a guarded lobby that checks your badge.

## Users, groups and sudo

```bash
sudo adduser asha                      # create a user (Debian/Ubuntu)
sudo usermod -aG sudo,ssh-users asha   # add to groups (-a = append!)
sudo visudo -f /etc/sudoers.d/deploy   # edit sudo rules safely (syntax-checked)
# deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart api
sudo userdel -r olduser                # remove someone who left, with their home
```

Prefer specific sudo rules over full root for automation users, and remove access promptly when people change roles or leave (ideally via central identity — LDAP/SSO).

## Packages and patching

- **Package managers** (`apt`, `dnf`) install software with dependencies and verify signatures from trusted repositories.
- Pin versions for critical software; read changelogs for major upgrades.
- **Automatic security updates:** `unattended-upgrades` (Debian/Ubuntu) or `dnf-automatic`. Kernel updates need a reboot — schedule reboots, or use live patching for critical systems.
- Know what's installed and vulnerable: vulnerability scanners and SBOMs (Security track, chapter 7).

> [!NOTE] **Immutable infrastructure** changes the patching story: instead of updating servers in place, build a new machine image (Packer) or container image with the updates, roll it out, and retire the old servers. Servers never drift, and rollback is switching back to the previous image.

## Disks and filesystems

```bash
lsblk                         # disks and partitions as a tree
df -hT                        # usage and filesystem type per mount
sudo mkfs.ext4 /dev/nvme1n1   # format a new disk (destroys its contents!)
sudo mkdir -p /data && sudo mount /dev/nvme1n1 /data
sudo blkid /dev/nvme1n1       # get its UUID for fstab
```

To mount it at every boot, add a line to `/etc/fstab`, using the UUID (device names can change between boots):

```text
UUID=3f6c…  /data  ext4  defaults,noatime,nofail  0  2
```

> [!WARN] A typo in `/etc/fstab` can stop a server from booting. Test with `sudo mount -a` before rebooting, and use `nofail` for non-essential disks so a missing disk doesn't block boot.

- **LVM** (logical volume manager) lets you grow volumes across disks and take snapshots; cloud disks can usually be **resized online** — grow the volume, then the partition (`growpart`) and filesystem (`resize2fs` / `xfs_growfs`).
- **Filesystems:** ext4 (solid default), XFS (large files, RHEL default), Btrfs/ZFS (snapshots, checksums, compression).
- Watch both **space** (`df -h`) and **inodes** (`df -i`) — Linux track, chapter 2.

## Logs that don't fill the disk

Applications and services log to the **journal** (`journalctl`) or to files in `/var/log`. Left alone, log files grow until the disk is full — one of the most common causes of outages.

```text
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14            # keep two weeks
    compress
    delaycompress
    missingok
    notifempty
    copytruncate         # or use postrotate to signal the app to reopen its file
}
```

Cap the journal's size in `/etc/systemd/journald.conf` (`SystemMaxUse=1G`), and ship logs to a central system so local copies can be short-lived.

## Time

Distributed systems, TLS certificates, logs and authentication tokens all depend on correct clocks. Keep servers in **UTC**, and run time sync (`chrony` or `systemd-timesyncd`) against reliable sources (cloud providers offer local time services). Check with `timedatectl` and `chronyc tracking`.

## Scheduled jobs

Use **cron** or **systemd timers** for routine tasks — backups, cleanup, reports (Linux track, chapter 5). Make every job:

- **Logged** (output captured somewhere visible) and **monitored** ("did last night's backup run?" — a dead man's switch alert that fires if a job **doesn't** report success).
- **Idempotent** and safe to re-run, with a lock to prevent overlapping runs (`flock`).

## Backups: only real if you've restored one

> [!EXAMPLE] **GitLab, 31 January 2017.** While fighting a database replication problem late at night, an engineer accidentally deleted the primary database's data directory. The team then discovered that several backup methods hadn't been working — one had been silently failing for a long time. They recovered from a staging copy that happened to be six hours old, losing six hours of user data. GitLab live-streamed the recovery and published a famously honest postmortem. The lesson every team repeats: **a backup you haven't restored is a hope, not a backup.**

- Follow **3-2-1**: three copies, on two kinds of storage, one off-site (another region or account).
- Make backups **immutable** (object lock) so ransomware or a compromised admin can't delete them.
- **Automate restore tests**: regularly restore into a scratch environment and verify the data.
- Know your **RPO** (how much data you can afford to lose) and **RTO** (how long recovery may take), and design to meet them — e.g. database point-in-time recovery (Databases track, chapter 7).

## Configuration management: servers as code

Hand-configured servers drift: each one ends up slightly different, and nobody can rebuild them. **Configuration management** tools describe the desired state and apply it repeatedly:

```yaml
# Ansible playbook: the same result on 1 or 1,000 servers, safe to run again
- hosts: web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt: { name: nginx, state: present, update_cache: true }
    - name: Deploy site config
      ansible.builtin.template: { src: site.conf.j2, dest: /etc/nginx/sites-enabled/site.conf }
      notify: reload nginx
    - name: Ensure nginx is running
      ansible.builtin.service: { name: nginx, state: started, enabled: true }
  handlers:
    - name: reload nginx
      ansible.builtin.service: { name: nginx, state: reloaded }
```

Options: **Ansible** (agentless, over SSH), Chef, Puppet, Salt; **cloud-init** for first-boot setup; **Packer** for building machine images; **Terraform** for creating the servers themselves (chapter 6). In Kubernetes environments, most of this moves into container images and manifests — but the nodes underneath still need it.

> [!RECAP]
> - New servers: update, named users, **key-only SSH** (or no public SSH at all), firewall, automatic security updates, UTC + time sync, monitoring.
> - Manage access with groups and **specific sudo rules**; remove leavers promptly.
> - Patch continuously; prefer **immutable images** that are replaced rather than modified.
> - Mount disks by **UUID**, test fstab, grow volumes online; watch space and inodes.
> - **Rotate logs** and cap the journal; ship logs centrally.
> - Monitor scheduled jobs; **test restores** of 3-2-1, immutable backups against RPO/RTO.
> - Make servers reproducible with **configuration management** and images.

> [!INTERVIEW] DevOps and SRE interviews ask how you'd harden a new Linux server, handle a full disk, set up backups and prove they work, and why configuration management or immutable images beat manual changes.

::quiz {"q":"What's the most effective way to stop SSH password-guessing attacks?","options":["Change the port","Disable password authentication and use keys (or avoid public SSH entirely)","Use a longer username","Restart sshd daily"],"answer":1,"explain":"Without passwords, there's nothing to guess."}

::quiz {"q":"Why reference disks by UUID in /etc/fstab?","options":["UUIDs are shorter","Device names like /dev/sdb can change between boots; UUIDs don't","It's faster","fstab requires it"],"answer":1,"explain":"Otherwise a disk might be mounted in the wrong place."}

::quiz {"q":"When is a backup actually trustworthy?","options":["When the job reports success","When you've regularly restored from it and verified the data","When it's encrypted","When it's large"],"answer":1,"explain":"GitLab learned this the hard way."}
