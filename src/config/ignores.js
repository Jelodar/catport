export const DEFAULT_IGNORES = [
  // --- Version Control & Metadata ---
  '.git/', '.svn/', '.hg/', '.bzr/', '.cvs/', '.gitattributes', '.gitmodules',

  // --- OS & System Files ---
  '.DS_Store', '.DS_Store?', '._*', '.Spotlight-V100', '.Trashes',
  'Thumbs.db', 'ehthumbs.db', 'desktop.ini', '$RECYCLE.BIN/',
  '.AppleDouble/', '.LSOverride/',
  '.directory', '.fuse_hidden*', '.nfs*',

  // --- Editors & IDEs ---
  '.idea/', '.vscode/', '.vs/', '.settings/', '.classpath', '.project',
  '*.sublime-workspace', '*.sublime-project',
  '*.iml', '*.ipr', '*.iws', '*.suo', '*.ntvs*', '*.njsproj', '*.sln',
  '.factorypath', '.checkstyle', '.metadata/',
  'nbproject/', 'build.xml', // NetBeans / Ant
  '.history/', '.ionide/',   // VS Code history / Ionide
  'Session.vim', '.netrwhist', // Vim
  '*~', '#*#', '.#*', // Emacs / Vim

  // --- Logs, Temp, Backups ---
  '*.log', 'logs/', 'log/', '*.log.*',
  '*.backup', '*.bak', '*.tmp', '*.temp',
  '*.swp', '*.swo', '*.swn',
  '*.old', '*.orig', '*.rej',
  '*.dump', '*.stackdump', 'core',
  '*.pid', '*.seed',

  // --- Secrets, Credentials, Local Config (Security) ---
  '.env', '.env.*', '!.env.example', '!.env.sample', '!.env.template', '!.env.defaults',
  '*.pem', '*.key', '*.crt', '*.pfx', '*.p12', '*.der', '*.cer',
  'id_rsa', 'id_rsa.pub', 'known_hosts',
  'config.secret.*', 'secrets.*', 'credentials.*',
  '.npmrc', '.netrc', '.ssh/', '.aws/', '.gcloud/', '.azure/',

  // --- Build Outputs & Artifacts (General) ---
  'dist/', 'build/', 'out/', 'target/', 'obj/', 'bin/',
  'release/', 'debug/',
  '_build/', 'deps/',

  // --- Archives & Binary Assets ---
  '*.zip', '*.tar', '*.gz', '*.tgz', '*.rar', '*.7z', '*.iso', '*.dmg',
  '*.exe', '*.dll', '*.so', '*.so.*', '*.dylib', '*.bin', '*.msi', '*.app',
  '*.deb', '*.rpm', '*.apk', '*.jar', '*.war', '*.ear', '*.nar',
  '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg', '*.webp', '*.bmp', '*.tiff',
  '*.mp4', '*.mp3', '*.wav', '*.mov', '*.avi', '*.mkv', '*.webm', '*.flv',
  '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
  '*.ttf', '*.otf', '*.woff', '*.woff2', '*.eot',
  '*.psd', '*.ai', '*.hex', '*.out',

  // --- Node.js / JS / TS ---
  'node_modules/', 'bower_components/', 'jspm_packages/', 'web_modules/',
  '.npm/', '.yarn/', '.pnp.*', '.pnpm-store/',
  '.cache/', '.parcel-cache/', '.eslintcache/', '.stylelintcache/',
  'coverage/', '.nyc_output/', 'lib-cov/',
  '.grunt/', '.gulp/',
  '.next/', '.nuxt/', '.output/', '.docusaurus/', '.svelte-kit/', '.astro/',
  '*.min.js', '*.min.css', '*.map', 'report.[0-9]*.*', '*.tsbuildinfo',

  // --- Python ---
  '__pycache__/', '*.py[cod]', '*$py.class',
  'venv/', '.venv/', 'env/', 'ENV/',
  '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', '.tox/', '.nox/', '.coverage',
  'htmlcov/', 'pip-wheel-metadata/',
  '*.egg-info/', '.eggs/', '*.egg', 'instance/',
  'jupyter_cache/', '.ipynb_checkpoints/', 'celerybeat-schedule',

  // --- Java / JVM / Kotlin ---
  '*.class', '.gradle/', 'gradle-app.setting',
  'hs_err_pid*',

  // --- C / C++ / Obj-C ---
  '*.o', '*.obj', '*.lo', '*.la', '*.lai', '*.slo', '*.sl',
  '*.a', '*.lib',
  '*.gch', '*.pch', '*.d',
  '.make', 'cmake-build-*/', 'CMakeFiles/', 'CMakeCache.txt',
  '*.profraw', '*.gcda', '*.gcno',
  'DerivedData/', 'compile_commands.json',

  // --- .NET / C# ---
  '*.pdb', 'packages/', 'TestResult/',

  // --- Go ---
  'go.work', 'go.test', '_testmain.go',

  // --- Rust ---
  '*.rs.bk',

  // --- Ruby ---
  '.bundle/', 'lib/bundler/man/', '*.gem', '.ruby-version',

  // --- PHP ---
  'vendor/', 'composer.phar', '*.phar', '.phpunit.result.cache',

  // --- Swift ---
  '.swiftpm',

  // --- Dart / Flutter ---
  '.dart_tool/', '.pub-cache/', '.pub/',

  // --- Terraform ---
  '.terraform/', '*.tfstate', '.terraform.lock.hcl',

  // --- Serverless ---
  '.serverless/', '.aws-sam/', '.elasticbeanstalk/',

  // --- Virtualization ---
  '.vagrant/',

  // --- Databases ---
  '*.sqlite', '*.sqlite3', '*.db', '*.db3', '*.s3db',
  '*.db-journal', '*.mdb', '*.accdb',
  'dump.rdb',

  // --- Lock Files (Noise reduction) ---
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'Cargo.lock', 'Gemfile.lock', 'composer.lock', 'poetry.lock', 'Pipfile.lock',
  'go.sum', 'mix.lock', 'pubspec.lock', 'flake.lock'
];
