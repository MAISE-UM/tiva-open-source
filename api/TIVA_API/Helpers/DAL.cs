using System;
using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using TIVA_API.Models;

namespace TIVA_API.Helpers
{
    public class DAL
    {
        private string _connectionName;
        private string _connectionString;
        private SqlConnection _connection;
        private SqlTransaction _transaction;
        private bool _bInTransaction = false;
        private SqlCommand _command;
        private DatabaseSettings _databaseSettings = new();
        private AppSettings _appSettings = new();

        //*********************************************************************
        //Enums
        //*********************************************************************
        public enum SQLParameterTypes
        {
            INT,
            DBL,
            STR,
            DATE,
            DATETIME,
            BOOL,
            FLOAT,
            USERTYPE,
            OBJECT,
            OBJECTLIST,
            INVALID
        };
        
        public enum SQLParameterDestinationTypes
        {
            PARAMETER,
            BODY,
            URL,
            INVALID
        };

        public enum SQLTransactionTypes
        {
            COMMIT,
            ROLLBACK
        };

        //*********************************************************************
        //Structures
        //*********************************************************************
        public struct RetrieveScalarInfo
        {
            public bool bSuccess;
            public string sErrorMessage;
            public object oReturnValue;
        };


        public struct RetrieveDataInfo
        {
            public bool bSuccess;
            public string sErrorMessage;
            public DataTable oDT;
        };

        public struct RetrieveDataSetInfo
        {
            public bool bSuccess;
            public string sErrorMessage;
            public DataSet oDS;
        };

        public struct UpdateDataInfo
        {
            public bool bSuccess;
            public string sErrorMessage;
            public int iEffectedRows;
        };

        //Constructor
        public DAL(string connectionName)
        {
            Startup.StaticConfiguration.GetSection("DatabaseSettings").Bind(_databaseSettings);
            try
            {

                switch (connectionName)
                {
                    case "DEFAULT":
                        _connectionString = _databaseSettings.DEFAULT;
                        break;
                }

                if (_connectionString != "")
                {
                    _connection = new SqlConnection(_connectionString);
                    _connection.Open();
                    _command = new SqlCommand();

                }
                else
                {
                    // Do NOT log to the DB here: the DB is what failed.
                    LogUtil.WriteLog("Error:Database connection not found.", true, "SYSTEM", false, false);
                }

            }
            catch (Exception ex)
            {
                // Do NOT log to the DB here: logging to the DB would re-enter this
                // constructor and recurse until the stack overflows.
                LogUtil.WriteLog("Exception:" + ex.Message + ex.StackTrace, true, "SYSTEM", false, false);
            }
        }

        //*********************************************************************
        //Properties
        //*********************************************************************
        public string ConnectionName
        {
            get
            {
                return _connectionName;
            }

            set
            {
                _connectionName = value;
            }

        }


        //*********************************************************************
        //Methods
        //*********************************************************************
        public void StartTransaction()
        {
            if (_connection.State == ConnectionState.Closed)
            {
                _connection.Open();
            }
            _transaction = _connection.BeginTransaction();
            _bInTransaction = true;
        }

        public void EndTransaction(SQLTransactionTypes sqlTransTypes)
        {
            try
            {
                switch (sqlTransTypes)
                {
                    case SQLTransactionTypes.COMMIT:
                        _transaction.Commit();
                        _bInTransaction = false;
                        break;
                    case SQLTransactionTypes.ROLLBACK:
                        _transaction.Rollback();
                        _bInTransaction = false;
                        break;
                }
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog("Exception in End transaction:" + ex.Message + ex.StackTrace, true, "SYSTEM");
            }
            finally
            {
                _connection.Close();
            }
        }


        public void ClearSqlParameter()
        {
            _command.Parameters.Clear();
        }
        public void AddSqlParameter(string parameter_name, SQLParameterTypes parameter_type, object parameter_value)
        {
            try
            {
                SqlParameter param = new SqlParameter();

                param.ParameterName = parameter_name;
                switch (parameter_type)
                {
                    case SQLParameterTypes.STR:
                        param.SqlDbType = SqlDbType.VarChar;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.INT:
                        param.SqlDbType = SqlDbType.Int;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.DBL:
                        param.SqlDbType = SqlDbType.Decimal;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.DATETIME:
                        param.SqlDbType = SqlDbType.DateTime;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.DATE:
                        param.SqlDbType = SqlDbType.DateTime;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.BOOL:
                        param.SqlDbType = SqlDbType.Bit;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.FLOAT:
                        param.SqlDbType = SqlDbType.Float;
                        param.Value = parameter_value;
                        _command.Parameters.Add(param);
                        break;
                    case SQLParameterTypes.USERTYPE:
                        param.SqlDbType = SqlDbType.Structured;
                        param.Value = parameter_value;
                        param.TypeName = parameter_name + "Type";
                        _command.Parameters.Add(param);
                        break;
                }


            }
            catch (Exception ex)
            {
                LogUtil.WriteLog("Exception in adding parameters:" + ex.Message + ex.StackTrace, true, "SYSTEM");
            }
        }

        public RetrieveScalarInfo RetrieveScalar(string sql)
        {
            RetrieveScalarInfo ri = new RetrieveScalarInfo();
            try
            {

                if (_connection.State == ConnectionState.Closed)
                {
                    _connection.Open();
                }
                if (_bInTransaction)
                {
                    _command.Transaction = _transaction;
                }
                _command.Connection = _connection;
                _command.CommandText = sql;



                ri.bSuccess = true;
                ri.sErrorMessage = "";
                ri.oReturnValue = _command.ExecuteScalar();


            }
            catch (Exception ex)
            {
                ri.bSuccess = false;
                ri.sErrorMessage = "Exception in RetrieveScalarInfo. " + ex.Message + ex.StackTrace;
            }
            finally
            {
                if (!_bInTransaction)
                {
                    _connection.Close();
                }

            }

            return ri;
        }

        public RetrieveDataInfo RetrieveData(string sql)
        {
            Startup.StaticConfiguration.GetSection("AppSettings").Bind(_appSettings);
            RetrieveDataInfo ri = new RetrieveDataInfo();
            try
            {

                if (_connection.State == ConnectionState.Closed)
                {
                    _connection.Open();
                }
                if (_bInTransaction)
                {
                    _command.Transaction = _transaction;
                }

                _command.Connection = _connection;
                _command.CommandText = sql;
				_command.CommandTimeout = GeneralUtil.IntValue(_appSettings.SQL_TIMEOUT);
				SqlDataAdapter da = new SqlDataAdapter(_command);
                DataTable dt = new DataTable();
                da.Fill(dt);


                ri.bSuccess = true;
                ri.sErrorMessage = "";
                ri.oDT = dt;
            }
            catch (Exception ex)
            {
                ri.bSuccess = false;
                ri.sErrorMessage = "Exception in RetrieveDataInfo. " + ex.Message + ex.StackTrace;
            }
            finally
            {
                if (!_bInTransaction)
                {
                    _connection.Close();
                }
            }

            return ri;
        }

        public RetrieveDataSetInfo RetrieveDataSet(string sql)
        {
            Startup.StaticConfiguration.GetSection("AppSettings").Bind(_appSettings);
            RetrieveDataSetInfo ri = new RetrieveDataSetInfo();
            try
            {

                if (_connection.State == ConnectionState.Closed)
                {
                    _connection.Open();
                }
                if (_bInTransaction)
                {
                    _command.Transaction = _transaction;
                }

                _command.Connection = _connection;
                _command.CommandText = sql;
                _command.CommandTimeout = GeneralUtil.IntValue(_appSettings.SQL_TIMEOUT);
                SqlDataAdapter da = new SqlDataAdapter(_command);
                DataSet ds = new DataSet();
                da.Fill(ds);


                ri.bSuccess = true;
                ri.sErrorMessage = "";
                ri.oDS = ds;


            }
            catch (Exception ex)
            {
                ri.bSuccess = false;
                ri.sErrorMessage = "Exception in RetrieveDataInfo. " + ex.Message + ex.StackTrace;
            }
            finally
            {
                if (!_bInTransaction)
                {
                    _connection.Close();
                }
            }

            return ri;
        }

        public UpdateDataInfo UpdateData(string sql)
        {
            UpdateDataInfo ui = new UpdateDataInfo();
            try
            {
                if (_connection.State == ConnectionState.Closed)
                {
                    _connection.Open();
                }
                _command.Connection = _connection;
                _command.CommandText = sql;

                if (_bInTransaction)
                {
                    _command.Transaction = _transaction;
                }

                ui.bSuccess = true;
                ui.sErrorMessage = "";
                ui.iEffectedRows = _command.ExecuteNonQuery();

            }
            catch (Exception ex)
            {
                ui.bSuccess = false;
                ui.sErrorMessage = "Exception in UpdateDataInfo. " + ex.Message + ex.StackTrace;
            }
            finally
            {
                if (!_bInTransaction)
                {
                    _connection.Close();
                }

            }

            return ui;
        }

        public void CloseConnection()
        {
            _connection.Close();
        }
    }

}

