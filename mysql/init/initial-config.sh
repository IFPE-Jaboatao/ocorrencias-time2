#!/bin/bash
# Executado só na primeira subida do MySQL (volume de dados vazio).
# Garante usuário da aplicação em '%' e senha igual a MYSQL_PASSWORD (Adminer / rede Docker).
# Evite aspas simples em MYSQL_PASSWORD ou MYSQL_ROOT_PASSWORD (quebram o SQL).

set -euo pipefail

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
EOSQL