resource "kubernetes_service" "kovaa-labcrm_server" {
  metadata {
    name      = "${var.kovaa-labcrm_app_name}-server"
    namespace = kubernetes_namespace.kovaa-labcrm.metadata.0.name
  }
  spec {
    selector = {
      app = "${var.kovaa-labcrm_app_name}-server"
    }
    session_affinity = "ClientIP"
    port {
      name        = "http-tcp"
      port        = 3000
      target_port = 3000
    }

    type = "ClusterIP"
  }
}
