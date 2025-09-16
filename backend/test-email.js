/**
 * 邮件服务测试脚本
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
 * 测试健康检查
 */
async function testHealth() {
  console.log('🏥 测试健康检查...');

  try {
    const { statusCode, data } = await httpGet(`${SERVER_URL}/health`);

    if (statusCode === 200) {
      console.log('✅ 健康检查通过');
      console.log('   服务状态:', data.status);
      console.log('   服务名称:', data.service);
    } else {
      console.log('❌ 健康检查失败');
      console.log('   状态码:', statusCode);
    }
  } catch (error) {
    console.log('❌ 连接失败:', error.message);
    console.log('💡 请确保邮件服务正在运行: npm start');
    process.exit(1);
  }
}

/**
 * 测试邮件发送
 */
async function testEmailSending() {
  console.log('\n📧 测试邮件发送...');

  const testData = {
    email: '52282858@qq.com',
    password: 'TestPass123!'
  };

  try {
    const { statusCode, data } = await httpPost(`${SERVER_URL}/api/send-password-email`, testData);

    if (statusCode === 200 && data.success) {
      console.log('✅ 邮件发送成功!');
      console.log('   收件人:', testData.email);
      console.log('   密码:', testData.password);
      console.log('   消息ID:', data.messageId);
    } else {
      console.log('❌ 邮件发送失败');
      console.log('   状态码:', statusCode);
      console.log('   错误信息:', data.message);
      if (data.error) {
        console.log('   错误代码:', data.error);
      }
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🧪 开始测试邮件服务...\n');

  // 测试健康检查
  await testHealth();

  // 等待2秒后测试邮件发送
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试邮件发送
  await testEmailSending();

  console.log('\n🎉 测试完成!');
}

// 运行测试
main().catch(console.error);
