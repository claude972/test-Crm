resource "kubernetes_service" "kovaa-labcrm_redis" {
  metadata {
    name      = "${var.kovaa-labcrm_app_name}-redis"
    namespace = kubernetes_namespace.kovaa-labcrm.metadata.0.name
  }
  spec {
    selector = {
      app = "${var.kovaa-labcrm_app_name}-redis"
    }
    session_affinity = "ClientIP"
    port {
      port        = 6379
      target_port = 6379
    }

    type = "ClusterIP"
  }
}
