resource "kubernetes_namespace" "kovaa-labcrm" {
  metadata {
    annotations = {
      name = var.kovaa-labcrm_namespace
    }

    name = var.kovaa-labcrm_namespace
  }
}
