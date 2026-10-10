/* ============================================================
   Product logos.
   Sources: Simple Icons (CC0) and, where Simple Icons has no mark
   (AWS, Azure, SonarQube, Argo CD), Devicon (MIT). Logos are drawn
   as a CSS mask in the current text colour, so they match the theme
   and every logo looks like part of one set.
   - Each module's title slide gets a strip of the tools it covers.
   - A tool name at the start of a card heading or a table's first
     cell gets a small logo in front of it.
   ============================================================ */
(function () {
  const SI = "https://cdn.jsdelivr.net/npm/simple-icons@16.30.0/icons/";
  const DI = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/";
  const L = {
    linux: ["Linux", SI + "linux.svg"], ubuntu: ["Ubuntu", SI + "ubuntu.svg"], debian: ["Debian", SI + "debian.svg"],
    redhat: ["Red Hat", SI + "redhat.svg"], fedora: ["Fedora", SI + "fedora.svg"], alpine: ["Alpine", SI + "alpinelinux.svg"],
    bash: ["Bash", SI + "gnubash.svg"], git: ["Git", SI + "git.svg"], github: ["GitHub", SI + "github.svg"],
    gitlab: ["GitLab", SI + "gitlab.svg"], bitbucket: ["Bitbucket", SI + "bitbucket.svg"], jenkins: ["Jenkins", SI + "jenkins.svg"],
    actions: ["GitHub Actions", SI + "githubactions.svg"], circleci: ["CircleCI", SI + "circleci.svg"],
    argo: ["Argo CD", DI + "argocd/argocd-plain.svg"], flux: ["Flux", SI + "flux.svg"],
    docker: ["Docker", SI + "docker.svg"], podman: ["Podman", SI + "podman.svg"], containerd: ["containerd", SI + "containerd.svg"],
    kubernetes: ["Kubernetes", SI + "kubernetes.svg"], helm: ["Helm", SI + "helm.svg"],
    aws: ["AWS", DI + "amazonwebservices/amazonwebservices-plain-wordmark.svg", true], gcp: ["Google Cloud", SI + "googlecloud.svg"],
    azure: ["Azure", DI + "azure/azure-plain.svg"], digitalocean: ["DigitalOcean", SI + "digitalocean.svg"], openstack: ["OpenStack", SI + "openstack.svg"],
    vmware: ["VMware", SI + "vmware.svg", true], virtualbox: ["VirtualBox", SI + "virtualbox.svg"],
    terraform: ["Terraform", SI + "terraform.svg"], opentofu: ["OpenTofu", SI + "opentofu.svg"], ansible: ["Ansible", SI + "ansible.svg"],
    pulumi: ["Pulumi", SI + "pulumi.svg"], chef: ["Chef", SI + "chef.svg"], puppet: ["Puppet", SI + "puppet.svg"],
    prometheus: ["Prometheus", SI + "prometheus.svg"], grafana: ["Grafana", SI + "grafana.svg"], otel: ["OpenTelemetry", SI + "opentelemetry.svg"],
    elastic: ["Elastic", SI + "elastic.svg"], elasticsearch: ["Elasticsearch", SI + "elasticsearch.svg"], kibana: ["Kibana", SI + "kibana.svg"],
    jaeger: ["Jaeger", SI + "jaeger.svg"], datadog: ["Datadog", SI + "datadog.svg"], pagerduty: ["PagerDuty", SI + "pagerduty.svg"],
    nginx: ["nginx", SI + "nginx.svg"], cloudflare: ["Cloudflare", SI + "cloudflare.svg"], letsencrypt: ["Let's Encrypt", SI + "letsencrypt.svg"],
    owasp: ["OWASP", SI + "owasp.svg"], sonarqube: ["SonarQube", DI + "sonarqube/sonarqube-original.svg"], snyk: ["Snyk", SI + "snyk.svg"],
    vault: ["Vault", SI + "vault.svg"], trivy: ["Trivy", SI + "trivy.svg"], dependabot: ["Dependabot", SI + "dependabot.svg"],
    python: ["Python", SI + "python.svg"], node: ["Node.js", SI + "nodedotjs.svg"], flask: ["Flask", SI + "flask.svg"],
    postgres: ["PostgreSQL", SI + "postgresql.svg"], mysql: ["MySQL", SI + "mysql.svg"], redis: ["Redis", SI + "redis.svg"],
    mongodb: ["MongoDB", SI + "mongodb.svg"], jira: ["Jira", SI + "jira.svg"], confluence: ["Confluence", SI + "confluence.svg"],
    slack: ["Slack", DI + "slack/slack-plain.svg"], backstage: ["Backstage", SI + "backstage.svg"],
    cncf: ["CNCF", SI + "cncf.svg"], lf: ["Linux Foundation", SI + "linuxfoundation.svg"],
    broadcom: ["Broadcom", SI + "broadcom.svg"], javascript: ["JavaScript", SI + "javascript.svg"], yaml: ["YAML", SI + "yaml.svg"],
  };

  /* Tools covered by each module (title-slide strip) */
  const STRIPS = {
    basics: ["linux", "nginx", "postgres", "python", "node"],
    sdlc: ["jira", "confluence", "git", "github"],
    devops: ["git", "github", "jenkins", "docker", "kubernetes", "terraform", "prometheus", "grafana"],
    linux: ["linux", "ubuntu", "debian", "redhat", "fedora", "alpine", "bash"],
    net: ["nginx", "cloudflare", "letsencrypt", "linux"],
    git: ["git", "github", "gitlab", "bitbucket"],
    cicd: ["actions", "jenkins", "gitlab", "circleci", "argo", "flux"],
    docker: ["docker", "containerd", "podman", "python", "flask"],
    k8s: ["kubernetes", "helm", "containerd", "argo"],
    cloud: ["aws", "gcp", "azure", "digitalocean", "openstack"],
    iac: ["terraform", "opentofu", "ansible", "pulumi", "chef", "puppet"],
    obs: ["prometheus", "grafana", "otel", "elasticsearch", "kibana", "jaeger", "pagerduty"],
    sec: ["owasp", "sonarqube", "snyk", "trivy", "dependabot", "vault"],
    /* VCF Automation course */
    vbasics: ["vmware", "linux", "virtualbox"],
    vcf: ["vmware", "broadcom", "kubernetes"],
    vcfa: ["vmware", "broadcom", "terraform", "ansible"],
    tenancy: ["vmware", "kubernetes"],
    infra: ["vmware"],
    blueprints: ["vmware", "yaml", "git"],
    catalog: ["vmware"],
    orchestrator: ["vmware", "javascript", "python", "node"],
    integrations: ["terraform", "ansible", "git", "github"],
    day2: ["vmware", "prometheus"],
    career: ["vmware", "broadcom"],
    capstone: ["python", "flask", "docker", "actions", "kubernetes", "prometheus", "grafana"],
    roadmap: ["linux", "git", "docker", "kubernetes", "terraform", "aws", "prometheus", "cncf"],
  };

  /* Names that get an inline logo when they START a card heading or first table cell.
     Longest names first so "GitHub Actions" wins over "GitHub" and "Git". */
  const NAMES = [
    ["GitHub Actions", "actions"], ["GitLab CI", "gitlab"], ["Docker Compose", "docker"], ["Docker Hub", "docker"],
    ["CloudFormation", "aws"], ["Google Cloud", "gcp"], ["HashiCorp Vault", "vault"], ["Let's Encrypt", "letsencrypt"], ["Red Hat", "redhat"],
    ["Argo CD", "argo"], ["Argo Rollouts", "argo"], ["OpenTelemetry", "otel"], ["Elasticsearch", "elasticsearch"],
    ["PagerDuty", "pagerduty"], ["DigitalOcean", "digitalocean"], ["OpenStack", "openstack"], ["OpenTofu", "opentofu"],
    ["Kubernetes", "kubernetes"], ["Prometheus", "prometheus"], ["Terraform", "terraform"], ["PostgreSQL", "postgres"],
    ["containerd", "containerd"], ["Dependabot", "dependabot"], ["SonarQube", "sonarqube"], ["Bitbucket", "bitbucket"],
    ["CircleCI", "circleci"], ["Confluence", "confluence"], ["VirtualBox", "virtualbox"], ["Backstage", "backstage"],
    ["Grafana", "grafana"], ["Ansible", "ansible"], ["Jenkins", "jenkins"], ["GitHub", "github"], ["GitLab", "gitlab"],
    ["Pulumi", "pulumi"], ["Puppet", "puppet"], ["Podman", "podman"], ["Docker", "docker"], ["Ubuntu", "ubuntu"],
    ["Debian", "debian"], ["Fedora", "fedora"], ["Alpine", "alpine"], ["Kibana", "kibana"], ["Jaeger", "jaeger"],
    ["Datadog", "datadog"], ["MongoDB", "mongodb"], ["MySQL", "mysql"], ["Redis", "redis"], ["Python", "python"],
    ["Node.js", "node"], ["Flask", "flask"], ["VMware", "vmware"], ["Azure", "azure"], ["Amazon", "aws"], ["AWS", "aws"],
    ["GCP", "gcp"], ["OWASP", "owasp"], ["Trivy", "trivy"], ["Snyk", "snyk"], ["Vault", "vault"], ["Helm", "helm"],
    ["Flux", "flux"], ["Linux", "linux"], ["Bash", "bash"], ["nginx", "nginx"], ["NGINX", "nginx"], ["Jira", "jira"],
    ["Slack", "slack"], ["Chef", "chef"], ["Git", "git"],
    ["VMware", "vmware"], ["Broadcom", "broadcom"], ["JavaScript", "javascript"], ["YAML", "yaml"],
  ];

  const make = (key) => {
    const [name, url, wide] = L[key];
    const s = document.createElement("span");
    s.className = "logo" + (wide ? " wide" : "");
    s.style.setProperty("--logo", `url("${url}")`);
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", name + " logo");
    return s;
  };

  /* 1. Title-slide strips */
  document.querySelectorAll(".slides > section[data-module]").forEach((m) => {
    const keys = STRIPS[m.dataset.module];
    const host = m.querySelector(".module-title");
    if (!keys || !host || host.querySelector(".logo-strip")) return;
    const ul = document.createElement("ul");
    ul.className = "logo-strip";
    ul.setAttribute("aria-label", "Tools in this module");
    keys.forEach((k) => {
      const li = document.createElement("li");
      li.append(make(k), document.createTextNode(L[k][0]));
      ul.appendChild(li);
    });
    const lede = host.querySelector(".lede");
    lede ? lede.after(ul) : host.appendChild(ul);
  });

  /* 2. Inline logos in front of tool names */
  const targets = document.querySelectorAll(".card > h3, .card > h4, .reveal table td:first-child, .reveal table th[scope=row]");
  targets.forEach((el) => {
    if (el.querySelector(".logo")) return;
    const text = el.textContent.trim();
    for (const [name, key] of NAMES) {
      if (text === name || (text.startsWith(name) && /^[\s:(,/.-]/.test(text.slice(name.length)))) {
        el.prepend(make(key));
        break;
      }
    }
  });
})();
