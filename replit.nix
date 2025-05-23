{ pkgs }: {
  deps = [
    pkgs.lsof
    pkgs.iproute2
    pkgs.pm2
    pkgs.unzip
    pkgs.zip
    pkgs.nodejs_20
    pkgs.nodePackages.npm   # מוסיף את הפקודה npm כדי שתעבוד כמו שצריך
    pkgs.mongodb
    pkgs.rustc
    pkgs.openssl
    pkgs.libxcrypt
    pkgs.libiconv
    pkgs.cargo
    pkgs.postgresql
    pkgs.tk
    pkgs.tcl
    pkgs.qhull
    pkgs.pkg-config
    pkgs.gtk3
    pkgs.gobject-introspection
    pkgs.ghostscript
    pkgs.freetype
    pkgs.ffmpeg-full
    pkgs.cairo
    pkgs.glibcLocales
    pkgs.jq
  ];
}