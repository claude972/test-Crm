resource "kubernetes_service" "kovaa-labcrm_db" {
  metadata {
    name      = "${var.kovaa-labcrm_app_name}-db"
    namespace = kubernetes_namespace.kovaa-labcrm.metadata.0.name
  }
  spec {
    selector = {
      app = "${var.kovaa-labcrm_app_name}-db"
    }
    session_affinity = "ClientIP"
    port {
      port        = 5432
      target_port = 5432
    }

    type = "ClusterIP"
  }
}
