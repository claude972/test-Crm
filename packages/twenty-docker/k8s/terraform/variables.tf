######################
# Required Variables #
######################
variable "kovaa-labcrm_pgdb_admin_password" {
  type        = string
  description = "KovaaLab CRMCRM password for postgres database."
  sensitive   = true
}

variable "kovaa-labcrm_app_hostname" {
  type        = string
  description = "The protocol, DNS fully qualified hostname, and port used to access KovaaLab CRMCRM in your environment. Ex: https://crm.example.com:443"
}

######################
# Optional Variables #
######################
variable "kovaa-labcrm_app_name" {
  type        = string
  default     = "kovaa-labcrm"
  description = "A friendly name prefix to use for every component deployed."
}

variable "kovaa-labcrm_server_image" {
  type        = string
  default     = "kovaa-labcrm/kovaa-lab:latest"
  description = "KovaaLab CRMCRM server image for the server deployment. This defaults to latest. This value is also used for the workers image."
}

variable "kovaa-labcrm_db_image" {
  type        = string
  default     = "kovaa-labcrm/kovaa-lab-postgres-spilo:latest"
  description = "KovaaLab CRMCRM image for database deployment. This defaults to latest."
}

variable "kovaa-labcrm_server_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the KovaaLab CRMCRM server deployment. This defaults to 1."
}

variable "kovaa-labcrm_worker_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the KovaaLab CRMCRM worker deployment. This defaults to 1."
}

variable "kovaa-labcrm_db_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the KovaaLab CRMCRM database deployment. This defaults to 1."
}

variable "kovaa-labcrm_server_data_mount_path" {
  type        = string
  default     = "/app/packages/kovaa-lab-server/.local-storage"
  description = "KovaaLab CRMCRM mount path for servers application data. Defaults to '/app/packages/kovaa-lab-server/.local-storage'."
}

variable "kovaa-labcrm_db_pv_path" {
  type        = string
  default     = ""
  description = "Local path to use to store the physical volume if using local storage on nodes."
}

variable "kovaa-labcrm_server_pv_path" {
  type        = string
  default     = ""
  description = "Local path to use to store the physical volume if using local storage on nodes."
}

variable "kovaa-labcrm_db_pv_capacity" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity provisioned for database persistent volume."
}

variable "kovaa-labcrm_db_pvc_requests" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity reservation for database persistent volume claim."
}

variable "kovaa-labcrm_server_pv_capacity" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity provisioned for server persistent volume."
}

variable "kovaa-labcrm_server_pvc_requests" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity reservation for server persistent volume claim."
}

variable "kovaa-labcrm_namespace" {
  type        = string
  default     = "kovaa-labcrm"
  description = "Namespace for all KovaaLab CRMCRM resources"
}

variable "kovaa-labcrm_redis_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the KovaaLab CRMCRM Redis deployment. This defaults to 1."
}

variable "kovaa-labcrm_redis_image" {
  type        = string
  default     = "redis/redis-stack-server:latest"
  description = "KovaaLab CRMCRM image for Redis deployment. This defaults to latest."
}

variable "kovaa-labcrm_docker_data_mount_path" {
  type        = string
  default     = "/app/docker-data"
  description = "KovaaLab CRMCRM mount path for servers application data. Defaults to '/app/docker-data'."
}

variable "kovaa-labcrm_docker_data_pv_path" {
  type        = string
  default     = ""
  description = "Local path to use to store the physical volume if using local storage on nodes."
}

variable "kovaa-labcrm_docker_data_pv_capacity" {
  type        = string
  default     = "100Mi"
  description = "Storage capacity provisioned for server persistent volume."
}

variable "kovaa-labcrm_docker_data_pvc_requests" {
  type        = string
  default     = "100Mi"
  description = "Storage capacity reservation for server persistent volume claim."
}
