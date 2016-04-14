Pod::Spec.new do |s|
  s.name         = 'misakaSwift'
  s.version      = '0.0.4'
  s.summary      = 'misakaSwift for Transmit service'
  s.homepage     = 'https://github.com/xuduo/socket.io-httpproxy-iossdk'
  s.license      = {
      :type => 'GNU General Public License v2.0',
      :file => "LICENSE"
  }
  s.author       = { 'author' => 'author@gmail.com' }
  s.platform     = :ios, '7.0'
  s.requires_arc = true
  s.source_files = 'misakaSwift/MisakaKeepAlive/*','misakaSwift/SocketIOClientSwift/*'
  s.source       = { :git => 'https://github.com/xuduo/socket.io-httpproxy-iossdk.git', :tag => 'v#{spec.version}' }
end
