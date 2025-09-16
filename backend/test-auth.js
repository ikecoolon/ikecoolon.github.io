/**
 * 认证服务测试脚本
 */

import http from 'http';

const SERVER_URL = 'http://localhost:9010';

/**
 * HTTP GET 请求工具函数
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * HTTP POST 请求工具函数
 */
function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 测试获取密码配置
 */
async function testPasswordConfig() {
  console.log('🔧 测试获取密码配置...');

  try {
    const { statusCode, data } = await httpGet(`${SERVER_URL}/api/auth/password-config`);

    if (statusCode === 200 && data.success) {
      console.log('✅ 密码配置获取成功');
      console.log('   最后更新:', data.data.lastUpdated);
      console.log('   更新间隔:', data.data.updateInterval + '分钟');
      console.log('   下次更新:', data.data.nextUpdateTime);
      console.log('   剩余时间:', Math.floor(data.data.timeUntilExpiry / 60) + '分钟');
      return data.data;
    } else {
      console.log('❌ 密码配置获取失败');
      console.log('   状态码:', statusCode);
      console.log('   错误信息:', data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
    console.log('💡 请确保认证服务正在运行: npm start');
    process.exit(1);
  }
}

/**
 * 测试获取当前密码（开发环境）
 */
async function testCurrentPassword() {
  console.log('\n🔑 测试获取当前密码...');

  try {
    const { statusCode, data } = await httpGet(`${SERVER_URL}/api/auth/current-password`);

    if (statusCode === 200 && data.success) {
      console.log('✅ 当前密码获取成功');
      console.log('   密码:', data.password);
      console.log('   最后更新:', data.lastUpdated);
      console.log('   剩余时间:', Math.floor(data.timeUntilExpiry / 60) + '分钟');
      return data.password;
    } else {
      console.log('❌ 当前密码获取失败');
      console.log('   状态码:', statusCode);
      console.log('   错误信息:', data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
    return null;
  }
}

/**
 * 测试密码验证
 */
async function testPasswordVerification(password) {
  console.log('\n🔐 测试密码验证...');

  if (!password) {
    console.log('❌ 没有密码可用，跳过验证测试');
    return null;
  }

  const testData = {
    password: password
  };

  try {
    const { statusCode, data } = await httpPost(`${SERVER_URL}/api/auth/verify-password`, testData);

    if (statusCode === 200 && data.success) {
      console.log('✅ 密码验证成功');
      console.log('   用户名:', data.user.username);
      console.log('   邮箱:', data.user.email);
      console.log('   Token长度:', data.token.length);
      return data.token;
    } else {
      console.log('❌ 密码验证失败');
      console.log('   状态码:', statusCode);
      console.log('   错误信息:', data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
    return null;
  }
}

/**
 * 测试Token验证
 */
async function testTokenVerification(token) {
  console.log('\n🎫 测试Token验证...');

  if (!token) {
    console.log('❌ 没有Token可用，跳过验证测试');
    return;
  }

  const testData = {
    token: token
  };

  try {
    const { statusCode, data } = await httpPost(`${SERVER_URL}/api/auth/verify-token`, testData);

    if (statusCode === 200 && data.success) {
      console.log('✅ Token验证成功');
      console.log('   用户ID:', data.user.userId);
      console.log('   用户名:', data.user.username);
      console.log('   角色:', data.user.role);
    } else {
      console.log('❌ Token验证失败');
      console.log('   状态码:', statusCode);
      console.log('   错误信息:', data.message);
      if (data.error) {
        console.log('   错误类型:', data.error);
      }
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

/**
 * 测试密码刷新
 */
async function testPasswordRefresh() {
  console.log('\n🔄 测试密码刷新...');

  try {
    const { statusCode, data } = await httpPost(`${SERVER_URL}/api/auth/refresh-password`, {});

    if (statusCode === 200 && data.success) {
      console.log('✅ 密码刷新成功');
      console.log('   最后更新:', data.lastUpdated);
      console.log('   下次更新:', data.nextUpdateTime);
    } else {
      console.log('❌ 密码刷新失败');
      console.log('   状态码:', statusCode);
      console.log('   错误信息:', data.message);
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🧪 开始测试认证服务...\n');

  // 测试获取密码配置
  const config = await testPasswordConfig();
  if (!config) return;

  // 测试获取当前密码
  const currentPassword = await testCurrentPassword();

  // 测试密码验证
  const token = await testPasswordVerification(currentPassword);

  // 测试Token验证
  await testTokenVerification(token);

  // 测试密码刷新
  await testPasswordRefresh();

  console.log('\n🎉 认证服务测试完成!');
}

// 运行测试
main().catch(console.error);
