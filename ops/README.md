# GoAPI 备份工具

这些脚本只服务当前 `new-api` 仓库的 `goapi` 部署，不读取或修改参考项目 `NexToken` 的脚本。

## 一键备份

在本地工作区执行：

```bash
cd /Users/seelingzheng/developspace/AI/NexToken/new-api
./ops/backup-all.sh
```

默认连接 `root@103.236.96.12`。如果服务器没有配置 SSH 密钥，脚本会由 `ssh`/`scp` 提示输入密码；密码不会写入脚本、环境文件或备份文件。

默认备份目录：

```text
ops/backups/<UTC 时间>/goapi-all-<UTC 时间>.tar.gz
ops/backups/<UTC 时间>/goapi-data-<UTC 时间>.tar.gz（存在应用数据时）
ops/backups/<UTC 时间>/goapi-database-<UTC 时间>.tar.gz（存在数据库时）
ops/backups/<UTC 时间>/goapi-redis-<UTC 时间>.tar.gz（存在 Redis 数据时）
ops/backups/<UTC 时间>/goapi-image-<UTC 时间>.tar.gz
ops/backups/<UTC 时间>/*.sha256
ops/backups/<UTC 时间>/backup-manifest.txt
```

归档包含：

- `new-api` 容器挂载到 `/data` 的完整持久化数据，包括 SQLite 数据库及 WAL/SHM 文件；
- PostgreSQL `pg_dump -Fc` 全量备份（服务器存在 `postgres` 容器并能取得密码时）；
- Redis RDB 数据（服务器存在 `redis` 容器并有 `/data` 挂载时）；
- 当前运行的 GoAPI Docker 镜像；
- 容器检查信息、Docker 版本、运行容器/镜像列表和脱敏环境变量。

脚本会同时生成一个 `goapi-all-*` 总归档和按组件拆分的归档。每个归档都有独立的 `.sha256` 文件，方便按需恢复。

脚本不会执行 `docker compose down -v`、删除容器、删除卷或修改数据库内容。

## 参数覆盖

```bash
GOAPI_SERVER=root@103.236.96.12 \
GOAPI_SSH_KEY="$HOME/.ssh/id_ed25519_goapi" \
GOAPI_REMOTE_DIR=/opt/goapi \
GOAPI_LOCAL_BACKUP_DIR=/path/to/local/backups \
GOAPI_BACKUP_KEEP_DAYS=60 \
./ops/backup-all.sh
```

如果数据库容器不是默认名称，可以覆盖：

```bash
GOAPI_POSTGRES_CONTAINER=goapi-postgres \
GOAPI_REDIS_CONTAINER=goapi-redis \
./ops/backup-all.sh
```

数据库密码优先从环境变量读取；未传入时脚本尝试从容器环境中读取，仅用于执行备份，不写入本地文件。生产环境建议使用 SSH 密钥，并在运行脚本前通过环境变量提供数据库密码。

## 校验与恢复提示

脚本下载后会执行：

```bash
sha256sum -c goapi-backup-<UTC 时间>.tar.gz.sha256
```

恢复前应先停止目标应用并确认目标卷、数据库和镜像名称。不要直接覆盖生产卷。可先在隔离服务器上解压归档，确认 `metadata/manifest.txt` 与目标环境一致，再按数据类型分别恢复。

## 约束

- 备份只下载到当前工作区，默认不上传到第三方存储。
- 归档可能包含业务数据和应用镜像，必须限制本地备份目录权限并避免提交到 Git。
- `ops/backups/` 已加入 Git 忽略规则；备份文件不会被提交。
