tsParticles.load("network-background", {
  particles: {
    number: {
      value: 70
    },
    size: {
      value: 4
    },
    color: {
      value: "#64748b"
    },
    links: {
      enable: true,
      distance: 150,
      color: "#94a3b8",
      opacity: 0.25,
      width: 1
    },
    move: {
      enable: true,
      speed: 0.6
    }
  },
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "grab"
      }
    }
  }
});
