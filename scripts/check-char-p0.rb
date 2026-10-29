root = File.expand_path('../apps/crm/bot', __dir__)
files = Dir.glob(File.join(root, '**', '*.{rb,rake,jbuilder}')).reject do |file|
  file.split('/').any? { |segment| %w[node_modules vendor tmp coverage].include?(segment) }
end
failures = []
files.each do |file|
  begin
    RubyVM::InstructionSequence.compile_file(file)
  rescue SyntaxError => error
    failures << [file.delete_prefix("#{root}/"), error.message]
  end
end
failures.each { |file, message| warn "#{file}: #{message}" }
abort "Char P0: #{failures.length} syntax failures" unless failures.empty?
puts "Char P0: #{files.length} Ruby/Rake/Jbuilder files compiled without execution (Ruby #{RUBY_VERSION})."
