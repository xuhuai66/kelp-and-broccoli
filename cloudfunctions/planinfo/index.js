// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'test-7t28x',
  timeout: 10000
})



/**
 * 初始化plan_list
 * @param {Object} options 
 */
function init_plan_list(options) {
  const data = {
    open_id: options.open_id,
    title: options.title.trim(),          // 标题 String *
    detail: options.detail || '',         // 计划描述 String
    is_finish: false,                     // 完成状态 Boolean
    create_time: new Date().getTime(),    // 生成时间 Date (后端生成时间)
    update_time: new Date().getTime(),    // 更新时间 (后端生成时间)
    organize: options.organize || 'normal',  // 属于'我的一天'项目
    closing_date: options.closing_date || 0, // 截止时间(时间戳) Number
    stepList: options.stepList || [],      // 子计划列表
    repeat: {},                   // 重复周期 (前端生成时间)
  }

  return data;
}


// 云函数入口函数
exports.main = async (event) => {
  const db = cloud.database();
  
  switch (event.action) {
    case 'get_plan_list':
      return await get_plan_list(event, db);
    case 'add_plan_list':
      return await add_plan_list(event, db);
    case 'update_plan_list':
      return await update_plan_list(event, db);
    case 'delete_plan_list':
      return await delete_plan_list(event, db);
  }
}


/**
 * 获取计划数据
 */
async function get_plan_list(event, db) {
  const openId = event.open_id;

  if (!openId || openId[0] === '"') {
    return {
      code: '0',
      message: '获取失败'
    }
  }

  return db.collection('plan_list').where({
    open_id: openId
  }).get().then(res => {
    const planList = res.data;

    

    return {
      planList,
      code: '1',
      message: '获取成功',
    };
  })
}


/**
 * 添加计划 
 * @param {Array} plan_list {open_id*, title*, detail, organize*, closing_date}
 * @returns 带_id plan_list
 */
async function add_plan_list(event, db) {
  let planList = event.plan_list;

  if (!planList || planList.length === 0) {
    return {
      code: '0',
      message: '添加失败'
    }
  }


  
  const addList = [];
  planList.forEach(item => {
    if (item['open_id']) {
      const data = init_plan_list(item);
      addList.push(data);
    }
  });
      
  if (addList.length > 0) {
    return db.collection('plan_list')
      .add({ data: addList })
      .then(res => {
        console.log(res);
        res._ids.forEach((item, index) => {
          addList[index]['_id'] = item;
        });

        return {
          code: '1',
          message: '添加成功',
          add_list: addList
        };
      });
  } else {
    return {
      code: '0',
      message: '添加失败',
    };
  }
}


/**
 * 修改更新计划
 * @param {Array} plan_list {open_id*, title*, detail, organize*, closing_date}
 * @returns 更新成功值【数组】(未更新成功不在返回值里)
 */
async function update_plan_list(event, db) {
  const planList = event.plan_list;

  if (!planList || planList.length === 0) {
    return {
      code: '0',
      message: '更新失败'
    };
  }

  
  return new Promise((resolve) => {
    let returnData = [];
    planList.forEach((item, index) => {
      if (item['_id']) {
        delete item['notUpdated'];
        item.update_time = new Date().getTime();
  
        let data = JSON.stringify(item);
        data = JSON.parse(data);
  
        delete data['_id'];
    
        db.collection('plan_list')
          .doc(item._id)
          .update({ data })
          .then(res => {
            if (res.stats.updated === 1) {
              returnData.push(item);
            }
    
            if (index === planList.length - 1) {
              resolve(returnData);
            }
          });
      } else {
        if (index === planList.length - 1) {
          resolve(returnData);
        }
      }
    });
  }).then((returnData) => {
    if (returnData.length > 0) {
      return {
        code: '1',
        message: '更新成功',
        data: returnData
      };
    } else {
      return {
        code: '0',
        message: '更新失败',
      };
    }
  });

}


/**
 * 删除计划
 * @param {*} ids 删除的数据列表
 */
async function delete_plan_list(event, db) {
  const _ = db.command;
  const ids = event.ids;

  if (!ids) {
    return {
      code: '0',
      message: '删除失败，没有传递id'
    }
  } 

  try {
    return db.collection('plan_list').where({
      _id: _.in(ids)
    }).remove()
      .then(() => {
        return {
          code: '1',
          message: '删除成功'
        }
      });
  } catch(e) {
    console.log(e)
    return {
      code: '0',
      message: '删除失败le'
    }
  }
}
